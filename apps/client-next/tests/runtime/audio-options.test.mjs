/*
===========================================================================

audio-options.test.mjs - native volume compatibility and port-only quiet controls

Exercise shipped functions against an independent native oracle and real
JSON records. UI positions never reinterpret saved native integer levels.

===========================================================================
*/
import "../helpers/native-source-loader.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
const { audioAmplitude, audioOptions, effectiveAudioLevel, initialAudioOptions, defaultAudioOptions } = await import(
	"../../src/engine/foundation/audio/options.ts"
);
const { audioSliderMax, audioSliderLevel, audioSliderPosition, stepAudioLevel, audioLevelText } = await import(
	"../../src/engine/foundation/audio/volume-control.ts"
);
const { experimentalOptions } = await import( "../../src/engine/foundation/ui/experimental-options.ts" );

/*
================
native compatibility
================
*/
test("all 100 original levels match the original expression exactly", () => {
	for ( let level = 1; level <= 100; level++ ) {
		assert.equal( audioAmplitude( level, false ), Math.pow( 10, (20 * level - 2000) / 2000 ) );
		assert.equal( effectiveAudioLevel( level, false ), level );
		for ( const extended of [ false, true ] ) {
			assert.equal( audioSliderLevel( audioSliderPosition( level, extended ), extended ), level );
		}
	}
	assert.equal( audioAmplitude( 1, false ), Math.pow( 10, -.99 ) );
	assert.equal( audioAmplitude( 50, false ), Math.pow( 10, -.5 ) );
	assert.equal( audioAmplitude( 100, false ), 1 );
});

/*
================
quiet curve
================
*/
test("quiet controls increase strictly through the native boundary and mute exactly", () => {
	let previous = -1;
	for ( let position = 0; position <= audioSliderMax( true ); position++ ) {
		const level = audioSliderLevel( position, true ), amplitude = audioAmplitude( level, false );
		assert.equal( audioSliderPosition( level, true ), position );
		assert.ok( amplitude > previous );
		assert.equal( audioAmplitude( level, true ), 0 );
		if ( level > 0 && level < 1 ) {
			assert.ok( amplitude > 0 && amplitude < audioAmplitude( 1, false ) );
			assert.equal( amplitude, level * audioAmplitude( 1, false ) );
		}
		previous = amplitude;
	}
	assert.equal( audioAmplitude( 0, false ), 0 );
	assert.ok( Math.abs( audioAmplitude( 1 - 1e-12, false ) - audioAmplitude( 1, false ) ) < 1e-12 );
	assert.equal( stepAudioLevel( .98, 1, true ), 1 );
	assert.equal( stepAudioLevel( 1, 1, true ), 2 );
	assert.equal( stepAudioLevel( 2, -1, true ), 1 );
	assert.equal( stepAudioLevel( 1, -1, true ), .98 );
	assert.equal( stepAudioLevel( 0, 1, true ), .02 );
	assert.equal( stepAudioLevel( .02, -1, true ), 0 );
	assert.equal( stepAudioLevel( 0, -1, true ), 0 );
	assert.equal( stepAudioLevel( 100, 1, true ), 100 );
});

/*
================
saved records
================
*/
test("old integer and new fractional records retain their values and mute flags", () => {
	const original = { ...initialAudioOptions(), bgm: 1, effects: 20 };
	const quiet = { ...original, bgm: .02, effects: .123456789, environment: .98, muteEffects: true };
	for ( const value of [ original, quiet ] ) {
		assert.deepEqual( audioOptions( JSON.parse( JSON.stringify( value ) ) ), value );
		assert.notEqual( audioOptions( value ), value );
	}
	assert.deepEqual( defaultAudioOptions(), { ...initialAudioOptions(), bgm: 50 } );
	assert.equal( audioSliderPosition( quiet.effects, true ), 6 );
	assert.equal( quiet.effects, .123456789 );
	for ( const bad of [ null, [], {}, { ...original, muteBgm: 1 } ] ) assert.throws( () => audioOptions( bad ) );
	for ( const bad of [ -1, 101, 1.1, 50.5, NaN, Infinity, "0.1", undefined ] ) {
		for ( const key of [ "bgm", "effects", "environment" ] ) {
			assert.throws( () => audioOptions( { ...original, [key]: bad } ), /Invalid audio options/ );
		}
	}
});

/*
================
explicit opt-in
================
*/
test("disabled quiet levels are retained silently and never raised to the native minimum", () => {
	for ( const value of [ null, {}, { extendedQuietAudio: 1 }, { extendedQuietAudio: "true" } ] ) {
		assert.equal( experimentalOptions( value ).extendedQuietAudio, false );
	}
	assert.equal( experimentalOptions( { extendedQuietAudio: true } ).extendedQuietAudio, true );
	assert.equal( effectiveAudioLevel( .2, false ), 0 );
	assert.equal( effectiveAudioLevel( .2, true ), .2 );
	assert.equal( audioSliderPosition( .2, false ), 0 );
	assert.match( audioLevelText( .2, false, false ), /retained; enable/ );
	assert.equal( audioLevelText( 1, false, true ), "SRO level 1" );
	assert.equal( audioLevelText( .1, true, true ), "Quiet 0.1 (muted)" );
	for ( const bad of [ -1, .5, 150, NaN, Infinity ] ) assert.throws( () => audioSliderLevel( bad, true ) );
	assert.throws( () => stepAudioLevel( 1, 0, true ) );
});

/*
===========================================================================

options.ts - saved audio levels and their playback gain

Preserve native integer levels. Fractional sub-1 levels are port-only, not native.

===========================================================================
*/
// Retail 5CA340 stores three integer levels and three mute bytes.
/*
================
AudioOptions
================
*/
export interface AudioOptions {
	readonly bgm: number;
	readonly effects: number;
	readonly environment: number;
	readonly muteBgm: boolean;
	readonly muteEffects: boolean;
	readonly muteEnvironment: boolean;
}
/*
================
initialAudioOptions
================
*/
export function initialAudioOptions(): AudioOptions {
	return { bgm: 30, effects: 50, environment: 50, muteBgm: false, muteEffects: false, muteEnvironment: false };
}
// 5CA1A0 sends 50 to each slider; startup uses 30 for music.
/*
================
defaultAudioOptions
================
*/
export function defaultAudioOptions(): AudioOptions {
	return { ...initialAudioOptions(), bgm: 50 };
}
/*
================
audioOptions
================
*/
export function audioOptions( value: unknown ): AudioOptions {
	if ( !value || typeof value !== "object" || Array.isArray( value ) ) throw Error( "Invalid audio options" );
	const v = value as AudioOptions;
	if (
		![ v.bgm, v.effects, v.environment ].every( n =>
			Number.isFinite( n ) && n >= 0 && n <= 100 && (n < 1 || Number.isInteger( n ))
		) ||
		![ v.muteBgm, v.muteEffects, v.muteEnvironment ].every( n => typeof n === "boolean" )
	) throw Error( "Invalid audio options" );
	return {
		bgm: v.bgm,
		effects: v.effects,
		environment: v.environment,
		muteBgm: v.muteBgm,
		muteEffects: v.muteEffects,
		muteEnvironment: v.muteEnvironment
	};
}
// 714180: (5 * level - 500) * 4 hundredths of a dB. Mute is -10000.
/*
================
nativeAudioAmplitude
================
*/
function nativeAudioAmplitude( level: number ): number {
	return Math.pow( 10, (20 * level - 2000) / 2000 );
}

/*
================
audioAmplitude

Port-only, not native: interpolate below level 1 without changing its native branch.
================
*/
export function audioAmplitude( level: number, muted: boolean ): number {
	if ( muted || level === 0 ) return 0;
	if ( level < 1 ) return level * nativeAudioAmplitude( 1 );
	return nativeAudioAmplitude( level );
}

/*
================
effectiveAudioLevel

Turning off the port-only extension must never raise a retained quiet setting.
================
*/
export function effectiveAudioLevel( level: number, extended: boolean ): number {
	return !extended && level < 1 ? 0 : level;
}

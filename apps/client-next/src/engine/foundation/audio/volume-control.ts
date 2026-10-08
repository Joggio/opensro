/*
===========================================================================

volume-control.ts - port-only quiet volume slider positions and labels

The browser range keeps integer steps. Saved values remain SRO levels;
only the opted-in control gives the sub-1 range additional physical travel.

===========================================================================
*/
import { effectiveAudioLevel } from "./options";

export const QUIET_VOLUME_STEPS = 50;
const NATIVE_VOLUME_MAX = 100;
// Fifty quiet intervals followed by the remaining ninety-nine native levels.
const EXTENDED_VOLUME_MAX = 149;

/*
================
audioSliderMax
================
*/
export function audioSliderMax( extended: boolean ): number {
	return extended ? EXTENDED_VOLUME_MAX : NATIVE_VOLUME_MAX;
}

/*
================
audioSliderLevel
================
*/
export function audioSliderLevel( position: number, extended: boolean ): number {
	if ( !Number.isInteger( position ) || position < 0 || position > audioSliderMax( extended ) ) {
		throw Error( "Invalid audio slider position" );
	}
	if ( !extended ) return position;
	return position <= QUIET_VOLUME_STEPS ? position / QUIET_VOLUME_STEPS : position - QUIET_VOLUME_STEPS + 1;
}

/*
================
audioSliderPosition

Round only the control projection; never normalize a retained saved fraction.
================
*/
export function audioSliderPosition( level: number, extended: boolean ): number {
	const effective = effectiveAudioLevel( level, extended );
	if ( !extended ) return effective;
	return effective < 1 ? Math.round( effective * QUIET_VOLUME_STEPS ) : effective + QUIET_VOLUME_STEPS - 1;
}

/*
================
stepAudioLevel
================
*/
export function stepAudioLevel( level: number, delta: number, extended: boolean ): number {
	if ( delta !== -1 && delta !== 1 ) throw Error( "Invalid audio slider step" );
	const position = Math.max(
		0,
		Math.min( audioSliderMax( extended ), audioSliderPosition( level, extended ) + delta )
	);
	return audioSliderLevel( position, extended );
}

/*
================
audioLevelText
================
*/
export function audioLevelText( level: number, muted: boolean, extended: boolean ): string {
	const selected = level === 0 ? "Silent" : level < 1 ? `Quiet ${String( level )}` : `SRO level ${level}`;
	if ( !extended && level > 0 && level < 1 ) return `${selected} retained; enable Extended quiet audio to hear it`;
	return muted ? `${selected} (muted)` : selected;
}

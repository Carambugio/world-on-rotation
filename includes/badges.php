<?php
/**
 * A personal stamp for selectors without a photo or logo: a rectangular arrival stamp with their initials
 * and name in one of the stamp inks, drawn as an SVG at /?wor_badge=<selector slug>. Unlike the round place stamps.
 *
 * @package World_On_Rotation
 */

defined( 'ABSPATH' ) || exit;

/** Address of a selector's stamp. */
function wor_badge_url( $slug ) {
	return add_query_arg( 'wor_badge', rawurlencode( $slug ), home_url( '/' ) );
}

/** The stamp itself, as SVG markup. */
function wor_badge_svg( $name, $slug ) {
	$inks  = array( '#24498a', '#a3302b', '#2d6a44', '#6a3d8f', '#0f6b70', '#8a4a14', '#a0306a', '#3d5560' );
	$h     = abs( crc32( $slug ) );
	$ink   = $inks[ $h % count( $inks ) ];
	$rot   = ( $h >> 5 ) % 17 - 8;
	$clean = trim( preg_replace( '/\s+/u', ' ', html_entity_decode( wp_strip_all_tags( $name ), ENT_QUOTES, 'UTF-8' ) ) );
	$words = array_values( array_filter( preg_split( '/[\s\-]+/u', $clean ) ) );
	if ( count( $words ) > 1 ) {
		$ini = mb_substr( $words[0], 0, 1 ) . mb_substr( $words[ count( $words ) - 1 ], 0, 1 );
	} else {
		$ini = mb_substr( $clean, 0, 2 );
	}
	$ini  = esc_html( mb_strtoupper( $ini ) );
	$rim  = esc_html( mb_strtoupper( mb_substr( $clean, 0, 18 ) ) );
	$size = mb_strlen( $ini ) > 1 ? 44 : 50;
	$seed = $h % 97;
	// A rectangular arrival stamp with cut corners: a passport stamp, but not the round postmark used for places
	$cut  = function ( $x0, $y0, $x1, $y1, $c ) {
		return sprintf( 'M%d %dH%dL%d %dV%dL%d %dH%dL%d %dV%dZ', $x0 + $c, $y0, $x1 - $c, $x1, $y0 + $c, $y1 - $c, $x1 - $c, $y1, $x0 + $c, $x0, $y1 - $c, $y0 + $c );
	};
	return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">'
		. '<defs><filter id="worn" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="' . $seed . '" result="n"/>'
		. '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.65" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs>'
		. '<rect width="200" height="200" fill="#efe6d2"/>'
		. '<g transform="rotate(' . $rot . ' 100 100)" filter="url(#worn)" fill="none" stroke="' . $ink . '">'
		. '<path d="' . $cut( 24, 46, 176, 154, 12 ) . '" stroke-width="4"/>'
		. '<path d="' . $cut( 31, 53, 169, 147, 8 ) . '" stroke-width="1.3"/>'
		. '<path d="M40 74H160M40 128H160" stroke-width="1"/>'
		. '<g fill="' . $ink . '" stroke="none" text-anchor="middle" font-family="Courier New, Courier, monospace" font-weight="700">'
		. '<text x="100" y="68" font-size="10" letter-spacing="3">★ SELECTOR ★</text>'
		. '<text x="100" y="101" dy="0.35em" font-size="' . $size . '" font-family="Georgia, Times New Roman, serif" letter-spacing="1">' . $ini . '</text>'
		. '<text x="100" y="140" font-size="9.5" letter-spacing="1.6">' . $rim . '</text>'
		. '</g></g></svg>';
}

add_action(
	'init',
	function () {
		if ( ! isset( $_GET['wor_badge'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		$slug = sanitize_title( wp_unslash( $_GET['wor_badge'] ) ); // phpcs:ignore WordPress.Security.NonceVerification
		$post = get_page_by_path( $slug, OBJECT, 'wor_selector' );
		if ( ! $post || 'publish' !== $post->post_status ) {
			status_header( 404 );
			exit;
		}
		header( 'Content-Type: image/svg+xml; charset=utf-8' );
		header( 'Cache-Control: public, max-age=604800' );
		header( 'X-Content-Type-Options: nosniff' );
		echo wor_badge_svg( get_the_title( $post ), $slug ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
	},
	1
);

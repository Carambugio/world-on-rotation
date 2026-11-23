<?php
/**
 * A personal monogram for selectors without a photo or logo: large initials and their name on a solid
 * ink background, drawn as an SVG at /?wor_badge=<selector slug>. Deliberately unlike the round place stamps.
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
	$size  = mb_strlen( $ini ) > 1 ? 76 : 88;
	$lines = '';
	for ( $k = -10; $k <= 20; $k++ ) {   // fine diagonal engraving across the background
		$x      = $k * 14;
		$lines .= '<path d="M' . $x . ' 200 Q' . ( $x + 60 ) . ' 110 ' . ( $x + 100 ) . ' 100 T' . ( $x + 200 ) . ' 0"/>';
	}
	return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">'
		. '<rect width="200" height="200" fill="' . $ink . '"/>'
		. '<g fill="none" stroke="#efe6d2" stroke-opacity=".09" stroke-width="1">' . $lines . '</g>'
		. '<text x="100" y="96" dy="0.35em" font-size="' . $size . '" text-anchor="middle" fill="#f4ecdc" font-family="Georgia, Times New Roman, serif" font-weight="700" letter-spacing="-2">' . $ini . '</text>'
		. '<rect x="62" y="138" width="76" height="1.6" fill="#f4ecdc" fill-opacity=".7"/>'
		. '<text x="100" y="158" font-size="11" text-anchor="middle" fill="#f4ecdc" fill-opacity=".9" font-family="Courier New, Courier, monospace" font-weight="700" letter-spacing="2">' . $rim . '</text>'
		. '</svg>';
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

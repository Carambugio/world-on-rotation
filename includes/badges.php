<?php
/**
 * A personal stamp for selectors without a photo or logo: their initials in the middle and their name
 * around the rim, in one of the stamp inks, drawn as an SVG at /?wor_badge=<selector slug>.
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
	$rim  = esc_html( mb_strtoupper( mb_substr( $clean, 0, 26 ) ) );
	$size = mb_strlen( $ini ) > 1 ? 58 : 66;
	return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">'
		. '<rect width="200" height="200" fill="#efe6d2"/>'
		. '<defs><path id="t" d="M34 100a66 66 0 0 1 132 0"/><path id="b" d="M27 100a73 73 0 0 0 146 0"/></defs>'
		. '<g transform="rotate(' . $rot . ' 100 100)" fill="none" stroke="' . $ink . '">'
		. '<circle cx="100" cy="100" r="88" stroke-width="5"/>'
		. '<circle cx="100" cy="100" r="80" stroke-width="1.5"/>'
		. '<circle cx="100" cy="100" r="52" stroke-width="1.5" stroke-dasharray="3 3"/>'
		. '<g fill="' . $ink . '" stroke="none" font-family="Courier New, Courier, monospace" font-weight="700">'
		. '<text font-size="14" letter-spacing="2.6" text-anchor="middle"><textPath href="#t" startOffset="50%">' . $rim . '</textPath></text>'
		. '<text font-size="10.5" letter-spacing="3" text-anchor="middle"><textPath href="#b" startOffset="50%">WORLD ON ROTATION</textPath></text>'
		. '<text x="100" y="100" dy="0.35em" font-size="' . $size . '" text-anchor="middle" font-family="Georgia, Times New Roman, serif">' . $ini . '</text>'
		. '<text x="38" y="106" font-size="14" text-anchor="middle">★</text><text x="162" y="106" font-size="14" text-anchor="middle">★</text>'
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

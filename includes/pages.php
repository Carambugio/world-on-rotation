<?php
/**
 * About, Privacy policy and Cookies pages, plus the contact details they show.
 *
 * The contact email and the company name are set in Settings → General,
 * and the pages pick them up through the [wor_contact] and [wor_legal_name] shortcodes.
 *
 * @package World_On_Rotation
 */

defined( 'ABSPATH' ) || exit;

/** Contact email and company name, under Settings → General. */
function wor_contact_settings() {
	register_setting( 'general', 'wor_contact_email', array( 'type' => 'string', 'sanitize_callback' => 'sanitize_email', 'default' => '' ) );
	register_setting( 'general', 'wor_legal_name', array( 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field', 'default' => 'Rhythm Passport' ) );
	add_settings_field( 'wor_contact_email', 'World on Rotation contact email', function () {
		printf( '<input type="email" class="regular-text" name="wor_contact_email" value="%s"><p class="description">Shown on the About, Privacy policy and Cookies pages.</p>', esc_attr( get_option( 'wor_contact_email', '' ) ) );
	}, 'general' );
	add_settings_field( 'wor_legal_name', 'Company running the site', function () {
		printf( '<input type="text" class="regular-text" name="wor_legal_name" value="%s"><p class="description">The registered company name, as it should appear on the Privacy policy.</p>', esc_attr( get_option( 'wor_legal_name', 'Rhythm Passport' ) ) );
	}, 'general' );
}
add_action( 'admin_init', 'wor_contact_settings' );

add_shortcode( 'wor_contact', function () {
	$email = get_option( 'wor_contact_email', '' );
	return $email ? '<a href="mailto:' . esc_attr( antispambot( $email ) ) . '">' . esc_html( antispambot( $email ) ) . '</a>' : 'the email address that will appear here shortly';
} );
add_shortcode( 'wor_legal_name', function () {
	return esc_html( get_option( 'wor_legal_name', 'Rhythm Passport' ) ?: 'Rhythm Passport' );
} );
add_shortcode( 'wor_updated', function () {
	return esc_html( get_option( 'wor_pages_updated', '22 November 2026' ) );
} );

/** The text of a bundled page. */
function wor_page_text( $slug ) {
	$f = WOR_DIR . 'data/pages/' . $slug . '.html';
	return file_exists( $f ) ? trim( file_get_contents( $f ) ) : '';
}

/** Text with whitespace squeezed, to tell an untouched page from an edited one. */
function wor_page_fingerprint( $html ) {
	return md5( preg_replace( '/\s+/', ' ', trim( $html ) ) );
}

/**
 * Create the About, Privacy policy and Cookies pages if they are missing.
 * Replaces only pages nobody has edited: the first About text, or WordPress's own draft privacy page.
 */
function wor_create_pages() {
	$pages = array(
		'about'          => 'About',
		'privacy-policy' => 'Privacy policy',
		'cookies'        => 'Cookies',
	);
	$done  = (array) get_option( 'wor_pages_made', array() );
	foreach ( $pages as $slug => $title ) {
		$text = wor_page_text( $slug );
		if ( ! $text ) {
			continue;
		}
		$page = get_page_by_path( $slug, OBJECT, 'page' );
		$args = array( 'post_type' => 'page', 'post_title' => $title, 'post_name' => $slug, 'post_content' => $text, 'post_status' => 'publish' );
		if ( ! $page ) {
			$id = wp_insert_post( $args );
		} elseif ( 'about' === $slug && empty( $done['about'] ) && 'cf2577b6d6cb4a4790d38eacf11f775e' === wor_page_fingerprint( $page->post_content ) ) {
			// The original About text from the first import, still unedited.
			$id = wp_update_post( array( 'ID' => $page->ID, 'post_content' => $text ) );
		} elseif ( 'privacy-policy' === $slug && 'publish' !== $page->post_status ) {
			// WordPress's own unpublished sample privacy page.
			$args['ID'] = $page->ID;
			$id         = wp_update_post( $args );
		} else {
			$id = $page->ID;
		}
		if ( 'privacy-policy' === $slug && $id && ! is_wp_error( $id ) ) {
			update_option( 'wp_page_for_privacy_policy', (int) $id );
		}
		$done[ $slug ] = 1;
	}
	update_option( 'wor_pages_made', $done );
}

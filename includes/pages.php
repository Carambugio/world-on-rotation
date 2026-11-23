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
 * Create the About, Privacy policy and Cookies pages if they are missing, and bring them up to date
 * after a plugin update. A page is only replaced while it is still exactly the text the plugin put
 * there (or WordPress's own unpublished sample privacy page); pages edited in the dashboard are left alone.
 */
function wor_create_pages() {
	$pages = array(
		'about'          => 'About',
		'privacy-policy' => 'Privacy policy',
		'cookies'        => 'Cookies',
		'submit'         => 'Submit a mix',
	);
	// Fingerprints of earlier bundled versions of each page.
	$previous = array(
		'about'          => array( 'cf2577b6d6cb4a4790d38eacf11f775e', 'f4d6d6999692ba725ce8ede38571e614', '343e23efd72ad51a3b3613a3ad499768', '30af00ecc004352a0360cd0f265e9ce7' ),
		'privacy-policy' => array( '77ccbe770afff0fb97306239826f3a81', '13fabfd85a7d7afcc1014971ad7c19c3' ),
		'cookies'        => array( 'd97b0c56393eb8f6408d335c50e50f5f' ),
		'submit'         => array(),
	);
	foreach ( $pages as $slug => $title ) {
		$text = wor_page_text( $slug );
		if ( ! $text ) {
			continue;
		}
		$page = get_page_by_path( $slug, OBJECT, 'page' );
		$id   = 0;
		if ( ! $page ) {
			$id = wp_insert_post( array( 'post_type' => 'page', 'post_title' => $title, 'post_name' => $slug, 'post_content' => $text, 'post_status' => 'publish' ) );
		} else {
			$now   = wor_page_fingerprint( $page->post_content );
			$known = array_merge( $previous[ $slug ], array( get_post_meta( $page->ID, '_wor_page_saved', true ) ) );
			// The very first About text, as saved by the first import, still unedited.
			if ( 'about' === $slug && false !== strpos( $page->post_content, 'sample placeholders for now' ) && false !== strpos( $page->post_content, 'Every place you play adds a stamp to your passport. World on Rotation is a Rhythm Passport project, run from London.' ) ) {
				$known[] = $now;
			}
			if ( 'privacy-policy' === $slug && 'publish' !== $page->post_status ) {
				$id = wp_update_post( array( 'ID' => $page->ID, 'post_title' => $title, 'post_content' => $text, 'post_status' => 'publish' ) );
			} elseif ( $now !== wor_page_fingerprint( $text ) && in_array( $now, $known, true ) ) {
				$id = wp_update_post( array( 'ID' => $page->ID, 'post_content' => $text ) );
			} else {
				$id = $page->ID;
			}
		}
		if ( $id && ! is_wp_error( $id ) ) {
			clean_post_cache( $id );
			$saved = get_post( $id );
			if ( $saved && wor_page_fingerprint( $saved->post_content ) === wor_page_fingerprint( $text ) ) {
				update_post_meta( $id, '_wor_page_saved', wor_page_fingerprint( $saved->post_content ) );
			}
			if ( 'privacy-policy' === $slug ) {
				update_option( 'wp_page_for_privacy_policy', (int) $id );
			}
		}
	}
}

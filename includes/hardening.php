<?php
/**
 * Small security measures that work alongside Wordfence.
 *
 * Bots guess logins with common usernames ('admin') or with usernames they read off the site.
 * This file closes the usual places a username leaks from and switches off XML-RPC, which
 * the site does not use and which lets bots try many passwords in one request.
 *
 * @package World_On_Rotation
 */

defined( 'ABSPATH' ) || exit;

// XML-RPC: off.
add_filter( 'xmlrpc_enabled', '__return_false' );
add_filter( 'xmlrpc_methods', '__return_empty_array' );
add_action(
	'init',
	function () {
		if ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) {
			status_header( 403 );
			exit;
		}
	},
	0
);
add_filter(
	'wp_headers',
	function ( $h ) {
		unset( $h['X-Pingback'] );
		return $h;
	}
);

// The REST API does not list users to visitors.
add_filter(
	'rest_endpoints',
	function ( $e ) {
		if ( ! is_user_logged_in() ) {
			foreach ( array_keys( $e ) as $route ) {
				if ( 0 === strpos( $route, '/wp/v2/users' ) ) {
					unset( $e[ $route ] );
				}
			}
		}
		return $e;
	}
);

// No author pages and no ?author=N scans.
add_action(
	'template_redirect',
	function () {
		if ( is_author() || ( isset( $_GET['author'] ) && ! is_admin() ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			wp_safe_redirect( home_url( '/' ), 301 );
			exit;
		}
	},
	0
);
add_filter( 'redirect_canonical', fn( $url ) => ( isset( $_GET['author'] ) ? false : $url ) ); // phpcs:ignore WordPress.Security.NonceVerification
add_filter( 'author_link', fn() => home_url( '/' ) );

// No usernames in the sitemap or in oEmbed data.
add_filter( 'wp_sitemaps_add_provider', fn( $p, $name ) => ( 'users' === $name ? false : $p ), 10, 2 );
add_filter(
	'oembed_response_data',
	function ( $d ) {
		unset( $d['author_name'], $d['author_url'] );
		return $d;
	}
);

// The login form does not say whether a username exists.
add_filter( 'login_errors', fn() => __( 'Wrong username or password.', 'world-on-rotation' ) );

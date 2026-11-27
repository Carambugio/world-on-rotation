<?php
/**
 * Everything editable from Appearance → Customize → World on Rotation:
 * text on the globe page, menu labels, guide headings, footer, colours, what shows, sharing.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Every piece of fixed text: key => array( default, label, section ). */
function wort_text_fields() {
	return array(
		// Globe page.
		'search'        => array( 'Search a place, style, mix or selector', 'Search box placeholder', 'wort_globe' ),
		'passport'      => array( 'Your passport', '"Your passport" button', 'wort_globe' ),
		'random'        => array( '◉ Play something random', '"Play something random" button', 'wort_globe' ),
		'hint_center'   => array( 'Tap a stamp to fly there', 'Hint at the bottom centre', 'wort_globe' ),
		'hint_bottom'   => array( 'Drag to spin · scroll to zoom · tap a country', 'Hint at the bottom left', 'wort_globe' ),
		'intro_line'    => array( 'A random mix from your side of the world, playing now', 'Random-mix screen: line under the name', 'wort_globe' ),
		'intro_button'  => array( 'Open the globe', 'Random-mix screen: button', 'wort_globe' ),
		'player_note'   => array( "If it doesn't start by itself, press play.", 'Player: note under the player', 'wort_globe' ),
		'share_text'    => array( 'Mixes and playlists pinned to the places they come from: cities, towns, villages, regions and countries.', 'Description for Google and link previews', 'wort_sharing' ),
		// Menu.
		'nav_globe'     => array( 'Globe', 'Globe', 'wort_menu' ),
		'nav_places'    => array( 'Places', 'Places', 'wort_menu' ),
		'nav_countries' => array( 'Countries', 'Countries', 'wort_menu' ),
		'nav_selectors' => array( 'Selectors', 'Selectors', 'wort_menu' ),
		'nav_about'     => array( 'About', 'About', 'wort_menu' ),
		// Guide headings.
		'sound_of'      => array( 'The sound of', 'Guide title, before the place name', 'wort_guides' ),
		'traditions'    => array( 'Traditions and instruments', 'Country: traditions', 'wort_guides' ),
		'eras'          => array( 'Key eras and labels', 'Country: eras', 'wort_guides' ),
		'diaspora'      => array( 'Diaspora', 'Country: diaspora', 'wort_guides' ),
		'now'           => array( 'The scene now', 'Country: the scene now', 'wort_guides' ),
		'dig'           => array( 'Where to dig', 'Country: where to dig', 'wort_guides' ),
		'festivals'     => array( 'Festivals', 'Country: festivals', 'wort_guides' ),
		'records'       => array( 'Start here', 'Country: records to start with', 'wort_guides' ),
		'born'          => array( 'Born here', 'Place: born here', 'wort_guides' ),
		'adopted'       => array( 'Made it home', 'Place: made it home', 'wort_guides' ),
		'listen'        => array( 'Hear it live', 'Place: venues', 'wort_guides' ),
		'buy'           => array( 'Find the records', 'Place: record shops', 'wort_guides' ),
		'radio'         => array( 'Tune in', 'Place: radio', 'wort_guides' ),
		// Footer.
		'footer_text'   => array( 'A Rhythm Passport project', 'Footer line', 'wort_footer' ),
		'footer_url'    => array( 'https://rhythmpassport.com/', 'Footer link (leave empty for no link)', 'wort_footer' ),
	);
}

/** One piece of text, as set in the Customizer. */
function wort_t( $key ) {
	$f = wort_text_fields();
	$d = isset( $f[ $key ] ) ? $f[ $key ][0] : '';
	$v = get_theme_mod( 'wort_t_' . $key, $d );
	return '' === trim( (string) $v ) && 'footer_url' !== $key ? $d : $v;
}

/** All texts, for the globe script. */
function wort_t_all() {
	$out = array();
	foreach ( array_keys( wort_text_fields() ) as $k ) {
		$out[ $k ] = wort_t( $k );
	}
	return $out;
}

/** The motto. */
function wort_motto() {
	return get_theme_mod( 'wort_motto', 'Music... It Means the World To Us!' );
}

/** What can be switched off. */
function wort_toggles() {
	return array(
		'show_motto'       => 'Show the motto',
		'show_random'      => 'Show "Play something random"',
		'show_passport'    => 'Show "Your passport"',
		'show_stats'       => 'Show the counts (mixes, places, selectors)',
		'show_hint_center' => 'Show the hint at the bottom centre',
		'show_hint_bottom' => 'Show the hint at the bottom left',
		'show_tagline'     => 'Show the tagline under the name',
	);
}

function wort_on( $key ) {
	return (bool) get_theme_mod( 'wort_' . $key, true );
}

function wort_customize( $wp_customize ) {
	$wp_customize->add_panel(
		'wort',
		array(
			'title'       => 'World on Rotation',
			'priority'    => 25,
			'description' => 'Change the text, colours and look of the site. The site name and tagline are under Site Identity, together with the logo and the browser-tab icon.',
		)
	);
	$sections = array(
		'wort_globe'   => 'Globe page text',
		'wort_menu'    => 'Menu labels',
		'wort_guides'  => 'Guide headings',
		'wort_footer'  => 'Motto and footer',
		'wort_colours' => 'Colours',
		'wort_show'    => 'Show or hide',
		'wort_sharing' => 'Sharing (Google, WhatsApp, social)',
	);
	$i = 0;
	foreach ( $sections as $id => $title ) {
		$wp_customize->add_section( $id, array( 'title' => $title, 'panel' => 'wort', 'priority' => ++$i ) );
	}

	$wp_customize->add_setting( 'wort_motto', array( 'default' => 'Music... It Means the World To Us!', 'sanitize_callback' => 'sanitize_text_field' ) );
	$wp_customize->add_control( 'wort_motto', array( 'label' => 'Motto', 'section' => 'wort_footer', 'type' => 'text', 'priority' => 1 ) );

	foreach ( wort_text_fields() as $k => $f ) {
		$is_url = 'footer_url' === $k;
		$wp_customize->add_setting(
			'wort_t_' . $k,
			array(
				'default'           => $f[0],
				'sanitize_callback' => $is_url ? 'esc_url_raw' : ( 'share_text' === $k ? 'sanitize_textarea_field' : 'sanitize_text_field' ),
			)
		);
		$wp_customize->add_control(
			'wort_t_' . $k,
			array(
				'label'   => $f[1],
				'section' => $f[2],
				'type'    => $is_url ? 'url' : ( 'share_text' === $k ? 'textarea' : 'text' ),
			)
		);
	}

	foreach ( wort_colour_fields() as $k => $f ) {
		$wp_customize->add_setting( 'wort_c_' . $k, array( 'default' => $f[0], 'sanitize_callback' => 'sanitize_hex_color' ) );
		$wp_customize->add_control( new WP_Customize_Color_Control( $wp_customize, 'wort_c_' . $k, array( 'label' => $f[1], 'section' => 'wort_colours' ) ) );
	}

	foreach ( wort_toggles() as $k => $label ) {
		$wp_customize->add_setting( 'wort_' . $k, array( 'default' => true, 'sanitize_callback' => 'wort_bool' ) );
		$wp_customize->add_control( 'wort_' . $k, array( 'label' => $label, 'section' => 'wort_show', 'type' => 'checkbox' ) );
	}

	$wp_customize->add_setting( 'wort_share_image', array( 'default' => '', 'sanitize_callback' => 'esc_url_raw' ) );
	$wp_customize->add_control(
		new WP_Customize_Image_Control(
			$wp_customize,
			'wort_share_image',
			array(
				'label'       => 'Share image',
				'description' => 'Shown when someone posts the link on WhatsApp, Instagram, Facebook or X. Best size: 1200 × 630 pixels.',
				'section'     => 'wort_sharing',
			)
		)
	);
}
add_action( 'customize_register', 'wort_customize' );

function wort_bool( $v ) {
	return (bool) $v;
}

/** Colours: key => array( default, label ). */
function wort_colour_fields() {
	return array(
		'accent'     => array( '#f0b45e', 'Accent (buttons, tagline, motto, highlights)' ),
		'accent_ink' => array( '#1e1407', 'Text on accent buttons' ),
		'bg'         => array( '#070c14', 'Page background (inner pages)' ),
		'ink'        => array( '#f3eee4', 'Main text' ),
	);
}

function wort_c( $k ) {
	$f = wort_colour_fields();
	$v = get_theme_mod( 'wort_c_' . $k, $f[ $k ][0] );
	return $v ? $v : $f[ $k ][0];
}

function wort_rgba( $hex, $a ) {
	$hex = ltrim( $hex, '#' );
	if ( 3 === strlen( $hex ) ) {
		$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
	}
	return sprintf( 'rgba(%d,%d,%d,%s)', hexdec( substr( $hex, 0, 2 ) ), hexdec( substr( $hex, 2, 2 ) ), hexdec( substr( $hex, 4, 2 ) ), $a );
}

/** CSS from the Customizer: colours, hidden items, logo sizing. Printed last in <head>. */
function wort_custom_css() {
	$a   = wort_c( 'accent' );
	$ai  = wort_c( 'accent_ink' );
	$bg  = wort_c( 'bg' );
	$ink = wort_c( 'ink' );
	$css = ":root{--accent:$a;--accent-ink:$ai;--bg:$bg;--ink:$ink;--hi:" . wort_rgba( $a, .14 ) . "}\n";
	$css .= ".brand,.panel,.zoom,.proto,.hint,.now,.results,.profile,.bar{--accent:$a;--accent-ink:$ai;--ink:$ink;--hi:" . wort_rgba( $a, .14 ) . "}\n";
	$css .= '.g-link{text-decoration-color:' . wort_rgba( $a, .55 ) . "}\n";
	$css .= ".brand h1 img,.intro-head h1 img{display:block;max-width:100%;max-height:56px;width:auto;height:auto}.logo img{display:block;max-height:38px;width:auto}\n";
	$hide = array(
		'show_motto'       => '.motto',
		'show_random'      => '#to-record',
		'show_passport'    => '#my-pass',
		'show_stats'       => '#stats',
		'show_hint_center' => '#hint',
		'show_hint_bottom' => '.proto',
		'show_tagline'     => '.brand-eyebrow,.intro-sub,.logo small',
	);
	foreach ( $hide as $k => $sel ) {
		if ( ! wort_on( $k ) ) {
			$css .= $sel . "{display:none!important}\n";
		}
	}
	echo '<style id="wort-custom">' . wp_strip_all_tags( $css ) . "</style>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}
add_action( 'wp_head', 'wort_custom_css', 99 );

/** Share image tags, on every page. */
function wort_share_meta() {
	$img = get_theme_mod( 'wort_share_image', '' );
	if ( $img ) {
		echo '<meta property="og:image" content="' . esc_url( $img ) . '">' . "\n";
		echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
	}
	echo '<meta property="og:site_name" content="' . esc_attr( get_bloginfo( 'name' ) ) . '">' . "\n";
}
add_action( 'wp_head', 'wort_share_meta', 3 );

/** The site name as a logo image if one is set in Site Identity, otherwise as text. */
function wort_brand_name_html() {
	$id = get_theme_mod( 'custom_logo' );
	if ( $id ) {
		$img = wp_get_attachment_image( $id, 'medium', false, array( 'alt' => get_bloginfo( 'name' ) ) );
		if ( $img ) {
			return $img;
		}
	}
	return esc_html( get_bloginfo( 'name' ) );
}

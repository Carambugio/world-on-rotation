<?php
/**
 * Building blocks for the passport pages: stamps, cards, guide lists.
 * The stamp maths matches the globe's, so the same mix gets the same stamp everywhere.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const WORT_M32 = 0xffffffff;

function wort_ord( $ch ) {
	if ( function_exists( 'mb_ord' ) ) {
		return mb_ord( $ch, 'UTF-8' );
	}
	$u = unpack( 'N', iconv( 'UTF-8', 'UCS-4BE', $ch ) );
	return $u[1];
}

function wort_hash( $s ) {
	$h = 2166136261;
	foreach ( preg_split( '//u', (string) $s, -1, PREG_SPLIT_NO_EMPTY ) as $ch ) {
		$h ^= wort_ord( $ch );
		$h  = wort_mul32( $h, 16777619 );
	}
	return $h;
}

/** (a * b) mod 2^32 without float overflow. */
function wort_mul32( $a, $b ) {
	$a &= WORT_M32;
	$b &= WORT_M32;
	$lo = $a * ( $b & 0xffff );
	$hi = ( ( $a * ( $b >> 16 ) ) & 0xffff ) << 16;
	return ( $lo + $hi ) & WORT_M32;
}

function wort_rng( $seed ) {
	$s = $seed & WORT_M32;
	return function () use ( &$s ) {
		$s = wort_mul32( $s ^ ( $s >> 15 ), 1 | $s );
		$s = ( $s ^ ( ( $s + wort_mul32( $s ^ ( $s >> 7 ), 61 | $s ) ) & WORT_M32 ) ) & WORT_M32;
		return ( ( $s ^ ( $s >> 14 ) ) & WORT_M32 ) / 4294967296;
	};
}

function wort_plain_upper( $s ) {
	$s = remove_accents( (string) $s );
	return function_exists( 'mb_strtoupper' ) ? mb_strtoupper( $s, 'UTF-8' ) : strtoupper( $s );
}

function wort_stamp( $sid, $city, $code, $added, $size, $who = 'RHYTHM PASSPORT' ) {
	$months = array( 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC' );
	$inks   = array( '#24498a', '#a3302b', '#2d6a44', '#5a3d88', '#1d6466', '#7a4719' );
	$h      = wort_hash( $sid );
	$r      = wort_rng( $h );
	$rot    = $r() * 18 - 9;
	$v      = $h % 3;
	$col    = $inks[ ( $h >> 3 ) % count( $inks ) ];
	$ts     = strtotime( $added ? $added : 'today' );
	$date   = sprintf( '%02d %s %d', (int) gmdate( 'j', $ts ), $months[ (int) gmdate( 'n', $ts ) - 1 ], (int) gmdate( 'Y', $ts ) );
	$uid    = 's' . wort_hash( $sid . $size );
	$cty    = esc_html( wort_plain_upper( $city ) );
	$who    = esc_html( $who );
	$code   = esc_html( $code );
	$m      = 'font-family="IBM Plex Mono,ui-monospace,monospace"';
	$b      = 'font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="600"';
	if ( 0 === $v ) {
		$body = "<circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"none\" stroke=\"$col\" stroke-width=\"3.2\"/><circle cx=\"50\" cy=\"50\" r=\"33\" fill=\"none\" stroke=\"$col\" stroke-width=\"1.2\"/><path id=\"{$uid}a\" d=\"M50 50 m-36.5 0 a36.5 36.5 0 1 1 73 0\" fill=\"none\"/><path id=\"{$uid}b\" d=\"M50 50 m-36.5 0 a36.5 36.5 0 1 0 73 0\" fill=\"none\"/><text $m font-size=\"6\" font-weight=\"600\" letter-spacing=\"1.2\" fill=\"$col\"><textPath href=\"#{$uid}a\" startOffset=\"50%\" text-anchor=\"middle\" dominant-baseline=\"middle\">$cty</textPath></text><text $m font-size=\"4.6\" letter-spacing=\".9\" fill=\"$col\"><textPath href=\"#{$uid}b\" startOffset=\"50%\" text-anchor=\"middle\" dominant-baseline=\"middle\">$who</textPath></text><text x=\"50\" y=\"40\" text-anchor=\"middle\" $m font-size=\"5\" letter-spacing=\"1.4\" fill=\"$col\">ARRIVAL</text><text x=\"50\" y=\"58\" text-anchor=\"middle\" $b font-size=\"21\" fill=\"$col\">$code</text><text x=\"50\" y=\"67\" text-anchor=\"middle\" $m font-size=\"5\" fill=\"$col\">$date</text>";
	} elseif ( 1 === $v ) {
		$body = "<rect x=\"10\" y=\"20\" width=\"80\" height=\"60\" rx=\"7\" fill=\"none\" stroke=\"$col\" stroke-width=\"3\"/><rect x=\"15\" y=\"25\" width=\"70\" height=\"50\" rx=\"4\" fill=\"none\" stroke=\"$col\" stroke-width=\"1\"/><text x=\"50\" y=\"35\" text-anchor=\"middle\" $m font-size=\"6.2\" font-weight=\"600\" letter-spacing=\"1\" fill=\"$col\">$cty</text><text x=\"50\" y=\"55\" text-anchor=\"middle\" $b font-size=\"20\" fill=\"$col\">$code</text><text x=\"50\" y=\"63.5\" text-anchor=\"middle\" $m font-size=\"5\" fill=\"$col\">$date</text><text x=\"50\" y=\"71\" text-anchor=\"middle\" $m font-size=\"3.9\" letter-spacing=\".6\" fill=\"$col\">$who</text>";
	} else {
		$body = "<ellipse cx=\"50\" cy=\"50\" rx=\"42\" ry=\"31\" fill=\"none\" stroke=\"$col\" stroke-width=\"3\"/><ellipse cx=\"50\" cy=\"50\" rx=\"36\" ry=\"25.5\" fill=\"none\" stroke=\"$col\" stroke-width=\"1\" stroke-dasharray=\"2 1.6\"/><text x=\"50\" y=\"38\" text-anchor=\"middle\" $m font-size=\"5.8\" font-weight=\"600\" letter-spacing=\"1\" fill=\"$col\">$cty</text><text x=\"50\" y=\"56\" text-anchor=\"middle\" $b font-size=\"19\" fill=\"$col\">$code</text><text x=\"50\" y=\"64\" text-anchor=\"middle\" $m font-size=\"4.8\" fill=\"$col\">$date</text><path d=\"M22 50h8M70 50h8\" stroke=\"$col\" stroke-width=\"1.2\"/>";
	}
	return sprintf( '<svg class="stamp" viewBox="0 0 100 100" width="%1$d" height="%1$d" aria-hidden="true"><rect width="100" height="100" rx="9" fill="#efe7d5"/><g transform="rotate(%2$.1f 50 50)" filter="url(#rp-ink)" opacity=".9">%3$s</g></svg>', (int) $size, $rot, $body );
}

function wort_pstamp( $p, $size ) {
	$d   = wor_data();
	$who = isset( $d['C'][ $p['by'] ] ) ? wort_plain_upper( $d['C'][ $p['by'] ]['name'] ) : 'RHYTHM PASSPORT';
	return wort_stamp( $p['id'], $p['city'], $p['code'], $p['added'], $size, $who );
}

function wort_place_stamp( $c, $size ) {
	$added = $c['items'] ? end( $c['items'] )['added'] : $c['date'];
	return wort_stamp( 'city-' . $c['city'], $c['city'], $c['code'], $added, $size );
}

function wort_dur( $s ) {
	$h = intdiv( (int) $s, 3600 );
	$m = (int) round( ( (int) $s % 3600 ) / 60 );
	return ( $h ? $h . 'h ' : '' ) . sprintf( '%02dm', $m );
}

function wort_datel( $a ) {
	return gmdate( 'j M Y', strtotime( $a ) );
}

function wort_flight( $p ) {
	return 'RP ' . ( wort_hash( $p['id'] ) % 9000 + 1000 );
}

function wort_selector_name( $slug ) {
	$d = wor_data();
	return isset( $d['C'][ $slug ] ) ? $d['C'][ $slug ]['name'] : '';
}

function wort_selector_url( $slug ) {
	$d = wor_data();
	return isset( $d['C'][ $slug ] ) ? $d['C'][ $slug ]['url'] : home_url( '/selectors/' );
}

function wort_place_url( $city ) {
	$d = wor_data();
	return isset( $d['CITY'][ $city ] ) ? $d['CITY'][ $city ]['url'] : home_url( '/places/' );
}

/** Player: Mixcloud, Spotify, or the demo mix while the real link is missing. */
function wort_player( $p ) {
	$allow = 'encrypted-media; fullscreen; autoplay; idle-detection; speaker-selection; web-share';
	if ( $p['mixcloud'] ) {
		return '<iframe class="mc" title="Mixcloud player" height="120" src="https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&amp;autoplay=1&amp;feed=' . rawurlencode( $p['mixcloud'] ) . '" frameborder="0" allow="' . $allow . '"></iframe>';
	}
	if ( $p['spotify'] ) {
		return '<iframe class="mc" title="Spotify player" height="352" src="' . esc_url( $p['spotify'] ) . '?utm_source=generator&amp;theme=0" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>';
	}
	return '<iframe class="mc" title="Mixcloud player" height="120" src="https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&amp;autoplay=1&amp;feed=' . rawurlencode( '/RhythmPassport/mixes-rhythm-passport-vol1-dj-ni-mo/' ) . '" frameborder="0" allow="' . $allow . '"></iframe><p class="note">Demo audio: Rhythm Passport Vol.1 by DJ Ni Mo stands in until this playlist\'s own Mixcloud or Spotify link is added.</p>';
}

function wort_card( $p, $sub ) {
	return '<a class="card" href="' . esc_url( $p['url'] ) . '">' . wort_pstamp( $p, 64 ) . '<span><strong>' . esc_html( $p['title'] ) . '</strong><small>' . esc_html( $sub ) . '</small></span><em>' . esc_html( wort_dur( $p['dur'] ) ) . '</em></a>';
}

function wort_place_card( $c ) {
	return '<a class="card" href="' . esc_url( $c['url'] ) . '">' . wort_place_stamp( $c, 64 ) . '<span><strong>' . esc_html( $c['city'] ) . '</strong><small>' . esc_html( $c['country'] ) . '</small></span><em>' . count( $c['items'] ) . '</em></a>';
}

/** A name, linked if its list line had a link. */
/** Guide text: everything escaped except <strong> and <em> (artist names, titles, foreign terms). */
function wort_rich( $t ) {
	return wp_kses( (string) $t, array( 'strong' => array(), 'em' => array() ) );
}

function wort_nm( $n ) {
	$d     = wor_data();
	$plain = wp_strip_all_tags( $n );
	if ( ! empty( $d['LINKS'][ $plain ] ) ) {
		return '<a class="g-link" href="' . esc_url( $d['LINKS'][ $plain ] ) . '">' . wort_rich( $n ) . ' ↗</a>';
	}
	return wort_rich( $n );
}

function wort_glist( $title, $rows, $cls = '' ) {
	if ( ! $rows ) {
		return '';
	}
	$out = '';
	foreach ( $rows as $row ) {
		$out .= '<li><strong>' . wort_nm( $row[0] ) . '</strong>' . ( $row[1] ? '<span> · ' . wort_rich( $row[1] ) . '</span>' : '' ) . '</li>';
	}
	return '<div class="g-block' . ( $cls ? ' ' . esc_attr( $cls ) : '' ) . '"><h3>' . esc_html( $title ) . '</h3><ul class="g-list">' . $out . '</ul></div>';
}

function wort_gparas( $title, $ps ) {
	if ( ! $ps ) {
		return '';
	}
	$out = '';
	foreach ( $ps as $t ) {
		$out .= '<p>' . wort_rich( $t ) . '</p>';
	}
	return '<div class="g-block"><h3>' . esc_html( $title ) . '</h3>' . $out . '</div>';
}

function wort_paras( $ps ) {
	$out = '';
	foreach ( $ps as $t ) {
		$out .= '<p>' . wort_rich( $t ) . '</p>';
	}
	return $out;
}

function wort_plural( $n, $one, $many ) {
	return $n . ' ' . ( 1 === (int) $n ? $one : $many );
}

function wort_ink_defs() {
	return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><filter id="rp-ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="d"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.9 1.65" result="m"/><feComposite in="d" in2="m" operator="in"/></filter></defs></svg>';
}

/** Lat/lon in passport style. */
function wort_coords( $lat, $lon ) {
	return sprintf( '%.2f° %s, %.2f° %s', abs( $lat ), $lat >= 0 ? 'N' : 'S', abs( $lon ), $lon >= 0 ? 'E' : 'W' );
}

/** Country link if a guide exists. */
function wort_country_link( $country ) {
	$d = wor_data();
	if ( isset( $d['CGUIDE'][ $country ] ) ) {
		return '<a href="' . esc_url( $d['CGUIDE'][ $country ]['url'] ) . '">' . esc_html( $country ) . '</a>';
	}
	return esc_html( $country );
}

/** Stops a template cleanly when the plugin is off. */
function wort_need_plugin() {
	if ( function_exists( 'wor_data' ) ) {
		return true;
	}
	echo '<div class="intro-block"><h1>Almost there</h1><p class="lede">Activate the World on Rotation plugin to show the places, countries, selectors and mixes.</p></div>';
	return false;
}

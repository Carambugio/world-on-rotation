<?php
/**
 * Small shared helpers: list fields, slugs, codes, Mixcloud and Spotify links.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Parse a list field. One entry per line: "Name | note | link".
 * Note and link are optional; a second part that is a URL is read as the link.
 *
 * @return array[] each [ 'name' => , 'note' => , 'url' => ]
 */
function wor_parse_lines( $text ) {
	$rows = array();
	foreach ( preg_split( '/\r\n|\r|\n/', (string) $text ) as $line ) {
		$line = trim( $line );
		if ( '' === $line ) {
			continue;
		}
		$parts = array_map( 'trim', explode( '|', $line ) );
		$name  = $parts[0];
		$note  = '';
		$url   = '';
		if ( isset( $parts[1] ) ) {
			if ( preg_match( '#^https?://#i', $parts[1] ) ) {
				$url = $parts[1];
			} else {
				$note = $parts[1];
			}
		}
		if ( isset( $parts[2] ) && preg_match( '#^https?://#i', $parts[2] ) ) {
			$url = $parts[2];
		}
		if ( '' !== $name ) {
			$rows[] = array( 'name' => $name, 'note' => $note, 'url' => $url );
		}
	}
	return $rows;
}

/**
 * Paragraph field: paragraphs separated by a blank line.
 */
function wor_parse_paras( $text ) {
	$out = array();
	foreach ( preg_split( '/\n\s*\n/', str_replace( "\r", '', (string) $text ) ) as $p ) {
		$p = trim( preg_replace( '/\s+/', ' ', $p ) );
		if ( '' !== $p ) {
			$out[] = $p;
		}
	}
	return $out;
}

/** Text of post content, split into paragraphs. Bold and italics are kept; other markup is dropped. */
function wor_content_paras( $post ) {
	$text = preg_replace( '/<!--.*?-->/s', '', (string) $post->post_content );
	$text = preg_replace( array( '#<b(\s[^>]*)?>#i', '#</b>#i', '#<i(\s[^>]*)?>#i', '#</i>#i' ), array( '<strong>', '</strong>', '<em>', '</em>' ), $text );
	$text = wp_kses( str_replace( array( '</p>', '<br>', '<br />' ), "\n\n", $text ), array( 'strong' => array(), 'em' => array() ) );
	return wor_parse_paras( html_entity_decode( $text, ENT_QUOTES, 'UTF-8' ) );
}

function wor_plain( $s ) {
	$s = remove_accents( (string) $s );
	return $s;
}

function wor_slugify( $s ) {
	return trim( preg_replace( '/[^a-z0-9]+/', '-', strtolower( wor_plain( $s ) ) ), '-' );
}

function wor_code3( $s ) {
	return strtoupper( substr( preg_replace( '/[^A-Za-z]/', '', wor_plain( $s ) ), 0, 3 ) );
}

/**
 * Accept a full Mixcloud URL or a feed path, return the feed path the widget wants.
 */
function wor_mixcloud_feed( $value ) {
	$value = trim( (string) $value );
	if ( '' === $value ) {
		return '';
	}
	if ( preg_match( '#mixcloud\.com(/[^?\#]+)#i', $value, $m ) ) {
		$value = $m[1];
	}
	$value = '/' . trim( $value, '/' ) . '/';
	return $value;
}

/**
 * Spotify share link to embed URL, or '' if not a Spotify link.
 */
function wor_spotify_embed( $value ) {
	if ( preg_match( '#open\.spotify\.com/(?:intl-[a-z]+/)?(playlist|album|track|episode|show)/([A-Za-z0-9]+)#', (string) $value, $m ) ) {
		return 'https://open.spotify.com/embed/' . $m[1] . '/' . $m[2];
	}
	return '';
}

/** Countries that read better with "the". */
function wor_the_name( $n ) {
	return in_array( $n, array( 'United Kingdom', 'United States' ), true ) ? 'the ' . $n : $n;
}

function wor_iso3( $country ) {
	$iso = array(
		'Afghanistan' => 'AFG', 'Albania' => 'ALB', 'Algeria' => 'DZA', 'Andorra' => 'AND',
		'Angola' => 'AGO', 'Antigua and Barbuda' => 'ATG', 'Argentina' => 'ARG', 'Armenia' => 'ARM',
		'Aruba' => 'ABW', 'Australia' => 'AUS', 'Austria' => 'AUT', 'Azerbaijan' => 'AZE',
		'Bahamas' => 'BHS', 'Bahrain' => 'BHR', 'Bangladesh' => 'BGD', 'Barbados' => 'BRB',
		'Belarus' => 'BLR', 'Belgium' => 'BEL', 'Belize' => 'BLZ', 'Benin' => 'BEN',
		'Bermuda' => 'BMU', 'Bhutan' => 'BTN', 'Bolivia' => 'BOL', 'Bosnia and Herzegovina' => 'BIH',
		'Botswana' => 'BWA', 'Brazil' => 'BRA', 'Bulgaria' => 'BGR', 'Burkina Faso' => 'BFA',
		'Burundi' => 'BDI', 'Cabo Verde' => 'CPV', 'Cambodia' => 'KHM', 'Cameroon' => 'CMR',
		'Canada' => 'CAN', 'Central African Republic' => 'CAF', 'Chad' => 'TCD', 'Chile' => 'CHL',
		'China' => 'CHN', 'Colombia' => 'COL', 'Comoros' => 'COM', 'Cook Islands' => 'COK',
		'Costa Rica' => 'CRI', 'Croatia' => 'HRV', 'Cuba' => 'CUB', 'Curaçao' => 'CUW',
		'Cyprus' => 'CYP', 'Czechia' => 'CZE', 'Côte d\'Ivoire' => 'CIV', 'DR Congo' => 'COD',
		'Democratic Republic of the Congo' => 'COD', 'Denmark' => 'DNK', 'Djibouti' => 'DJI', 'Dominica' => 'DMA',
		'Dominican Republic' => 'DOM', 'Ecuador' => 'ECU', 'Egypt' => 'EGY', 'El Salvador' => 'SLV',
		'Equatorial Guinea' => 'GNQ', 'Eritrea' => 'ERI', 'Estonia' => 'EST', 'Eswatini' => 'SWZ',
		'Ethiopia' => 'ETH', 'Faroe Islands' => 'FRO', 'Fiji' => 'FJI', 'Finland' => 'FIN',
		'France' => 'FRA', 'French Polynesia' => 'PYF', 'Gabon' => 'GAB', 'Gambia' => 'GMB',
		'Georgia' => 'GEO', 'Germany' => 'DEU', 'Ghana' => 'GHA', 'Greece' => 'GRC',
		'Greenland' => 'GRL', 'Grenada' => 'GRD', 'Guam' => 'GUM', 'Guatemala' => 'GTM',
		'Guinea' => 'GIN', 'Guinea-Bissau' => 'GNB', 'Guyana' => 'GUY', 'Haiti' => 'HTI',
		'Honduras' => 'HND', 'Hong Kong' => 'HKG', 'Hungary' => 'HUN', 'Iceland' => 'ISL',
		'India' => 'IND', 'Indonesia' => 'IDN', 'Iran' => 'IRN', 'Iraq' => 'IRQ',
		'Ireland' => 'IRL', 'Isle of Man' => 'IMN', 'Israel' => 'ISR', 'Italy' => 'ITA',
		'Jamaica' => 'JAM', 'Japan' => 'JPN', 'Jordan' => 'JOR', 'Kazakhstan' => 'KAZ',
		'Kenya' => 'KEN', 'Kiribati' => 'KIR', 'Kosovo' => 'XKX', 'Kuwait' => 'KWT',
		'Kyrgyzstan' => 'KGZ', 'Laos' => 'LAO', 'Latvia' => 'LVA', 'Lebanon' => 'LBN',
		'Lesotho' => 'LSO', 'Liberia' => 'LBR', 'Libya' => 'LBY', 'Liechtenstein' => 'LIE',
		'Lithuania' => 'LTU', 'Luxembourg' => 'LUX', 'Madagascar' => 'MDG', 'Malawi' => 'MWI',
		'Malaysia' => 'MYS', 'Maldives' => 'MDV', 'Mali' => 'MLI', 'Malta' => 'MLT',
		'Mauritania' => 'MRT', 'Mauritius' => 'MUS', 'Mexico' => 'MEX', 'Moldova' => 'MDA',
		'Monaco' => 'MCO', 'Mongolia' => 'MNG', 'Montenegro' => 'MNE', 'Montserrat' => 'MSR',
		'Morocco' => 'MAR', 'Mozambique' => 'MOZ', 'Myanmar' => 'MMR', 'Namibia' => 'NAM',
		'Nepal' => 'NPL', 'Netherlands' => 'NLD', 'New Caledonia' => 'NCL', 'New Zealand' => 'NZL',
		'Nicaragua' => 'NIC', 'Niger' => 'NER', 'Nigeria' => 'NGA', 'North Korea' => 'PRK',
		'North Macedonia' => 'MKD', 'Norway' => 'NOR', 'Oman' => 'OMN', 'Pakistan' => 'PAK',
		'Palestine' => 'PSE', 'Panama' => 'PAN', 'Papua New Guinea' => 'PNG', 'Paraguay' => 'PRY',
		'Peru' => 'PER', 'Philippines' => 'PHL', 'Poland' => 'POL', 'Portugal' => 'PRT',
		'Puerto Rico' => 'PRI', 'Qatar' => 'QAT', 'Republic of the Congo' => 'COG', 'Romania' => 'ROU',
		'Russia' => 'RUS', 'Rwanda' => 'RWA', 'Saint Kitts and Nevis' => 'KNA', 'Saint Lucia' => 'LCA',
		'Saint Vincent and the Grenadines' => 'VCT', 'Samoa' => 'WSM', 'San Marino' => 'SMR', 'Saudi Arabia' => 'SAU',
		'Senegal' => 'SEN', 'Serbia' => 'SRB', 'Seychelles' => 'SYC', 'Sierra Leone' => 'SLE',
		'Singapore' => 'SGP', 'Slovakia' => 'SVK', 'Slovenia' => 'SVN', 'Solomon Islands' => 'SLB',
		'Somalia' => 'SOM', 'Somaliland' => 'SOM', 'South Africa' => 'ZAF', 'South Korea' => 'KOR',
		'South Sudan' => 'SSD', 'Spain' => 'ESP', 'Sri Lanka' => 'LKA', 'Sudan' => 'SDN',
		'Suriname' => 'SUR', 'Sweden' => 'SWE', 'Switzerland' => 'CHE', 'Syria' => 'SYR',
		'São Tomé and Príncipe' => 'STP', 'Taiwan' => 'TWN', 'Tajikistan' => 'TJK', 'Tanzania' => 'TZA',
		'Thailand' => 'THA', 'Timor-Leste' => 'TLS', 'Togo' => 'TGO', 'Tonga' => 'TON',
		'Trinidad and Tobago' => 'TTO', 'Tunisia' => 'TUN', 'Turkmenistan' => 'TKM', 'Türkiye' => 'TUR',
		'Uganda' => 'UGA', 'Ukraine' => 'UKR', 'United Arab Emirates' => 'ARE', 'United Kingdom' => 'GBR',
		'United States' => 'USA', 'United States Virgin Islands' => 'VIR', 'Uruguay' => 'URY', 'Uzbekistan' => 'UZB',
		'Vanuatu' => 'VUT', 'Vatican City' => 'VAT', 'Venezuela' => 'VEN', 'Vietnam' => 'VNM',
		'Western Sahara' => 'ESH', 'Yemen' => 'YEM', 'Zambia' => 'ZMB', 'Zimbabwe' => 'ZWE',
	);
	return isset( $iso[ $country ] ) ? $iso[ $country ] : wor_code3( $country );
}

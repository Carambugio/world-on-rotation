<?php
/**
 * All places.
 */
get_header();
if ( wort_need_plugin() ) :
	$wort_d         = wor_data();
	$wort_countries = array_unique( array_map( function ( $c ) { return $c['country']; }, $wort_d['CITY'] ) );
	$wort_cg        = array();
	foreach ( $wort_d['CGUIDE'] as $wort_n => $wort_g ) {
		$wort_cg[] = '<a href="' . esc_url( $wort_g['url'] ) . '">' . esc_html( $wort_n ) . '</a>';
	}
	?>
<div class="intro-block"><p class="eyebrow">Visas issued</p><h1>Places</h1><p class="lede">Big cities, small towns and villages, whole regions and whole countries. <?php echo esc_html( wort_plural( count( $wort_d['CITY'] ), 'place', 'places' ) . ' in ' . wort_plural( count( $wort_countries ), 'country', 'countries' ) ); ?> so far, each with its mixes and playlists and a short guide to its music: the styles it gave the world, who was born there, who made it home, and where to listen, buy records and tune in.</p></div>
	<?php if ( $wort_cg ) : ?>
<p class="lede">Country guides: <?php echo implode( ', ', $wort_cg ); // phpcs:ignore ?>.</p>
	<?php endif; ?>
<div class="cards"><?php foreach ( $wort_d['CITY'] as $wort_c ) { echo wort_place_card( $wort_c ); } // phpcs:ignore ?></div>
	<?php
endif;
get_footer();

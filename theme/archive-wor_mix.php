<?php
/**
 * Every mix and playlist, newest first.
 */
get_header();
if ( wort_need_plugin() ) :
	$wort_d = wor_data();
	?>
<div class="intro-block"><p class="eyebrow">Boarding passes</p><h1>Mixes and playlists</h1><p class="lede">Everything on the map, newest first.</p></div>
<div class="cards"><?php foreach ( $wort_d['P'] as $wort_x ) { echo wort_card( $wort_x, $wort_x['city'] . ' · ' . wort_selector_name( $wort_x['by'] ) ); } // phpcs:ignore ?></div>
	<?php
endif;
get_footer();

<?php
/**
 * All selectors.
 */
get_header();
if ( wort_need_plugin() ) :
	$wort_d = wor_data();
	?>
<div class="intro-block"><p class="eyebrow">Passport holders</p><h1>Selectors</h1><p class="lede">The people behind the mixes and playlists: selectors, DJs and curators who know a place's music from the inside.</p></div>
<div class="cards">
	<?php
	foreach ( $wort_d['C'] as $wort_slug => $wort_comp ) :
		$wort_n = count( array_filter( $wort_d['P'], function ( $x ) use ( $wort_slug ) { return $x['by'] === $wort_slug; } ) );
		if ( ! $wort_n ) {
			continue;
		}
		$wort_init = '';
		foreach ( preg_split( '/\s+/', $wort_comp['name'] ) as $wort_w ) {
			$wort_init .= function_exists( 'mb_substr' ) ? mb_substr( $wort_w, 0, 1 ) : substr( $wort_w, 0, 1 );
		}
		$wort_init = function_exists( 'mb_substr' ) ? mb_strtoupper( mb_substr( $wort_init, 0, 2 ) ) : strtoupper( substr( $wort_init, 0, 2 ) );
		?>
	<a class="card" href="<?php echo esc_url( $wort_comp['url'] ); ?>"><span class="mini-photo" aria-hidden="true"><?php echo esc_html( $wort_init ); ?></span><span><strong><?php echo esc_html( $wort_comp['name'] ); ?></strong><small><?php echo esc_html( $wort_comp['role'] . ' · ' . $wort_comp['base'] ); ?></small></span><em><?php echo (int) $wort_n; ?></em></a>
	<?php endforeach; ?>
</div>
	<?php
endif;
get_footer();

<?php
/**
 * Fallback for anything without its own template (blog posts, search, other archives).
 */
get_header();
?>
<div class="intro-block page-body">
	<?php if ( have_posts() ) : ?>
		<?php if ( ! is_singular() ) : ?>
			<p class="eyebrow">Archive</p><h1><?php echo esc_html( wp_strip_all_tags( get_the_archive_title() ) ); ?></h1>
		<?php endif; ?>
		<?php
		while ( have_posts() ) :
			the_post();
			if ( is_singular() ) {
				echo '<h1>' . esc_html( get_the_title() ) . '</h1>';
				the_content();
			} else {
				echo '<h2><a href="' . esc_url( get_permalink() ) . '">' . esc_html( get_the_title() ) . '</a></h2>';
				the_excerpt();
			}
		endwhile;
		the_posts_pagination();
		?>
	<?php else : ?>
		<p class="eyebrow">Nothing here</p><h1>Lost in transit</h1><p class="lede">This page does not exist. Try the globe or the list of places.</p>
		<p class="actions"><a class="btn primary" href="<?php echo esc_url( home_url( '/' ) ); ?>">Open the globe</a><a class="btn" href="<?php echo esc_url( home_url( '/places/' ) ); ?>">Places</a></p>
	<?php endif; ?>
</div>
<?php
get_footer();

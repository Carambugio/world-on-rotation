<?php
/**
 * Page header: logo, menu.
 */
$wort_here = '';
if ( is_post_type_archive( 'wor_place' ) || is_singular( 'wor_place' ) ) {
	$wort_here = 'places';
} elseif ( is_post_type_archive( 'wor_country' ) || is_singular( 'wor_country' ) ) {
	$wort_here = 'countries';
} elseif ( is_post_type_archive( 'wor_selector' ) || is_singular( 'wor_selector' ) ) {
	$wort_here = 'selectors';
} elseif ( is_page( 'about' ) ) {
	$wort_here = 'about';
}
$wort_nav = array(
	''           => wort_t( 'nav_globe' ),
	'places'     => wort_t( 'nav_places' ),
	'countries'  => wort_t( 'nav_countries' ),
	'selectors'  => wort_t( 'nav_selectors' ),
	'about'      => wort_t( 'nav_about' ),
);
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<?php echo wort_ink_defs(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
<header class="top"><div class="wrap top-in">
	<a class="logo" href="<?php echo esc_url( home_url( '/' ) ); ?>"><strong><?php echo wort_brand_name_html(); // phpcs:ignore ?></strong><small><?php bloginfo( 'description' ); ?></small></a>
	<?php if ( has_nav_menu( 'main' ) ) : ?>
		<?php wp_nav_menu( array( 'theme_location' => 'main', 'container' => 'nav', 'container_attr' => array( 'aria-label' => 'Main' ), 'items_wrap' => '%3$s', 'depth' => 1, 'fallback_cb' => false ) ); ?>
	<?php else : ?>
		<nav aria-label="Main">
		<?php foreach ( $wort_nav as $wort_slug => $wort_label ) : ?>
			<a href="<?php echo esc_url( home_url( '/' . ( $wort_slug ? $wort_slug . '/' : '' ) ) ); ?>"<?php echo $wort_here === $wort_slug && $wort_slug ? ' aria-current="page"' : ''; ?>><?php echo esc_html( $wort_label ); ?></a>
		<?php endforeach; ?>
		</nav>
	<?php endif; ?>
</div></header>
<main class="wrap">

<?php
/**
 * Plugin Name: Block Editor Image Filename Prompt
 * Description: Prompts for a filename when pasting images into the block editor and uploads with that filename.
 * Version: 1.0
 * License: GPLv2 or later
 * Author: Aiwos BV, Jurriaan Koops
 * Text Domain: block-editor-image-filename-prompt
 */

defined( 'ABSPATH' ) || exit;

const GIFP_PLUGIN_VERSION = '1.0';

/**
 * Enqueue block editor assets.
 */
function gifp_enqueue_block_editor_assets() {
	if ( ! current_user_can( 'upload_files' ) ) {
		return;
	}

	$build_js    = plugin_dir_path( __FILE__ ) . 'build/index.js';
	$build_asset = plugin_dir_path( __FILE__ ) . 'build/index.asset.php';

	if ( ! file_exists( $build_js ) ) {
		add_action(
			'admin_notices',
			static function () {
				$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
				if ( ! $screen || empty( $screen->is_block_editor ) ) {
					return;
				}
				echo '<div class="notice notice-warning"><p>';
				echo esc_html__( 'Block editor Image Filename Prompt: build assets not found. Run npm install && npm run build in the plugin folder.', 'block-editor-image-filename-prompt' );
				echo '</p></div>';
			}
		);
		return;
	}

	$asset = file_exists( $build_asset )
		? require $build_asset
		: array(
			'dependencies' => array(
				'wp-api-fetch',
				'wp-blocks',
				'wp-components',
				'wp-data',
				'wp-edit-post',
				'wp-element',
				'wp-notices',
				'wp-plugins',
			),
			'version'      => GIFP_PLUGIN_VERSION,
		);

	wp_enqueue_script(
		'block-editor-image-filename-prompt',
		plugins_url( 'build/index.js', __FILE__ ),
		$asset['dependencies'],
		$asset['version'],
		true
	);

	wp_add_inline_script(
		'block-editor-image-filename-prompt',
		'window.GIFilenamePrompt = ' . wp_json_encode(
			array(
				'nonce' => wp_create_nonce( 'wp_rest' ),
			)
		) . ';',
		'before'
	);
}
add_action( 'enqueue_block_editor_assets', 'gifp_enqueue_block_editor_assets' );

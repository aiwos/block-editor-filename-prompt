=== Block Editor Image Filename Prompt ===
Contributors: aiwos, jurriaankoops, svanderwindt
Tags: gutenberg, block-editor, image, filename, media-library, upload, paste, screenshots, seo, accessibility, alt-text
Requires at least: 5.9
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.0
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Name pasted images and set media metadata before upload in the WordPress block editor, then insert an Image block.

== Description ==

Block Editor Image Filename Prompt improves the image paste workflow in the WordPress block editor (Gutenberg). When an editor pastes an image, the plugin opens a dialog for filename and media details, uploads the image to the Media Library, and inserts it as a core Image block.

By default, pasted images often get generic names such as `image.png`, `blob.png`, or `screenshot.png`. This plugin helps editors choose clear filenames and add useful metadata before the image reaches the Media Library.

Features:

* Prompt for a filename before pasted images are uploaded.
* Add alternative text, media title, caption, and description during upload.
* Smart filename presets based on the current post title and date.
* Automatic filename sanitizing for cleaner, safer filenames.
* Final filename preview before upload.
* Correct file extension based on image type, including JPG, PNG, GIF, WebP, AVIF, BMP, and TIFF.
* Paste support for clipboard image files, image URLs, and copied HTML images where the image URL is available.
* Works in the block editor canvas, including the iframe editor canvas.
* Direct upload to the WordPress Media Library through the REST API.
* Automatic insertion as a WordPress core Image block with alt text and caption when provided.
* Runs only for users who can upload files.

Use it to:

* Give pasted screenshots and images meaningful filenames.
* Add accessibility-friendly alt text while the upload is still in context.
* Keep the WordPress Media Library easier to search and manage.
* Avoid duplicate or unclear image names.
* Improve image organization and SEO hygiene before files are uploaded.
* Speed up editorial workflows for teams that paste many screenshots, copied web images, or generated images.

Built by [Aiwos](https://aiwos.com), a digital studio that builds smart WordPress solutions, AI-powered workflows, and custom web applications for organizations that want practical automation.

Source code is available in the [GitHub repository](https://github.com/JurriaanK/gutenberg-image-filename-prompt). Please report issues, suggest improvements, or submit pull requests there.

Development note: `build/index.js` is the compiled output. The human-readable source is `src/index.js`.

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/block-editor-image-filename-prompt` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the "Plugins" screen in WordPress.

== Frequently Asked Questions ==

= How do I use this plugin? =

Paste an image into the WordPress block editor. A dialog appears before upload. Choose a filename preset such as post title, post title plus date, or date only, or enter your own filename. Optionally add alt text, title, caption, and description. The plugin sanitizes the filename, uploads the image, updates its media details, and inserts it as an Image block.

= What image sources does it support? =

The plugin supports pasted clipboard image files, image URLs, and copied HTML images when the image URL is available in the clipboard data.

= Who can use the prompt? =

Only logged-in users with permission to upload files can use the plugin.

== Changelog ==

= 1.0 =

* Initial release.

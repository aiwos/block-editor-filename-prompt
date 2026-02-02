import { registerPlugin } from '@wordpress/plugins';
import {
	Modal,
	Button,
	ButtonGroup,
	TextControl,
	Flex,
	FlexItem,
} from '@wordpress/components';
import { useEffect, useState, useRef } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { createBlock } from '@wordpress/blocks';
import { dispatch, select } from '@wordpress/data';

const nonce = window.GIFilenamePrompt?.nonce || window.wpApiSettings?.nonce;
if ( nonce ) {
	apiFetch.use( apiFetch.createNonceMiddleware( nonce ) );
}

const EXTENSIONS = {
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/avif': 'avif',
	'image/bmp': 'bmp',
	'image/tiff': 'tiff',
};

const extFromMime = ( mime ) => EXTENSIONS[ mime ] || 'png';

const slugify = ( input ) => {
	return ( input || '' )
		.toString()
		.trim()
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /(^-|-$)/g, '' ) || 'pasted-image';
};

const getPostTitle = () => {
	const editor = select( 'core/editor' );
	const title = editor?.getEditedPostAttribute
		? editor.getEditedPostAttribute( 'title' )
		: '';
	return title || '';
};

const getDateStamp = () => {
	const now = new Date();
	const y = String( now.getFullYear() );
	const m = String( now.getMonth() + 1 ).padStart( 2, '0' );
	const d = String( now.getDate() ).padStart( 2, '0' );
	return `${ y }${ m }${ d }`;
};

const getDefaultBaseName = () => {
	const title = getPostTitle();
	if ( title ) {
		return `${ slugify( title ) }-image`;
	}
	return `image-${ getDateStamp() }`;
};

const hasExtension = ( value ) => /\.[a-z0-9]{1,6}$/i.test( value || '' );

const sanitizeFilenameBase = ( input ) => {
	return ( input || '' )
		.toString()
		.trim()
		.toLowerCase()
		.replace( /[^a-z0-9.-]+/g, '-' )
		.replace( /(^[.-]+|[.-]+$)/g, '' );
};

const getImageUrlFromHtml = ( html ) => {
	if ( ! html ) {
		return '';
	}
	try {
		const doc = new DOMParser().parseFromString( html, 'text/html' );
		return doc?.querySelector( 'img' )?.getAttribute( 'src' ) || '';
	} catch ( error ) {
		return '';
	}
};

const isLikelyImageUrl = ( value ) => {
	const text = ( value || '' ).toString().trim();
	if ( ! text ) {
		return false;
	}
	if ( text.startsWith( 'data:image/' ) ) {
		return true;
	}
	try {
		const url = new URL( text );
		return /\.(png|jpe?g|gif|webp|avif|bmp|tiff?)$/i.test( url.pathname );
	} catch ( error ) {
		return false;
	}
};

const fetchImageBlob = async ( url ) => {
	const response = await fetch( url, { credentials: 'omit' } );
	if ( ! response.ok ) {
		throw new Error( 'Unable to fetch image from clipboard URL.' );
	}
	const blob = await response.blob();
	const mime =
		response.headers.get( 'content-type' ) ||
		blob.type ||
		'image/png';
	return { blob, mime };
};

const getNameOptions = () => {
	const title = slugify( getPostTitle() );
	const date = getDateStamp();
	const options = [
		{ label: 'Date', value: `image-${ date }` },
	];

	if ( title ) {
		options.unshift(
			{ label: 'Post title', value: `${ title }-image` },
			{ label: 'Post title + date', value: `${ title }-${ date }` }
		);
	}

	return options;
};

function Plugin() {
	const [ isOpen, setOpen ] = useState( false );
	const [ blob, setBlob ] = useState( null );
	const [ mime, setMime ] = useState( 'image/png' );
	const [ name, setName ] = useState( getDefaultBaseName() );
	const [ altText, setAltText ] = useState( '' );
	const [ mediaTitle, setMediaTitle ] = useState( '' );
	const [ caption, setCaption ] = useState( '' );
	const [ description, setDescription ] = useState( '' );
	const [ busy, setBusy ] = useState( false );
	const isOpenRef = useRef( false );

	useEffect( () => {
		isOpenRef.current = isOpen;
	}, [ isOpen ] );

	useEffect( () => {
		const onPaste = ( event ) => {
			const items = event.clipboardData?.items;
			if ( ! items || isOpenRef.current ) {
				return;
			}

			const imageItem = Array.from( items ).find(
				( item ) => item.type && item.type.startsWith( 'image/' )
			);
			const files = event.clipboardData?.files;
			const imageFile = files
				? Array.from( files ).find(
						( file ) => file.type && file.type.startsWith( 'image/' )
				  )
				: null;

			if ( imageItem || imageFile ) {
				event.preventDefault();

				const file = imageFile || imageItem.getAsFile();
				if ( ! file ) {
					return;
				}

				setName( getDefaultBaseName() );
				setBlob( file );
				setMime( imageItem?.type || file.type || 'image/png' );
				setOpen( true );
				return;
			}

			const html = event.clipboardData?.getData( 'text/html' );
			const urlFromHtml = getImageUrlFromHtml( html );
			const plainText = event.clipboardData?.getData( 'text/plain' );
			const url =
				urlFromHtml || ( isLikelyImageUrl( plainText ) ? plainText : '' );

			if ( ! url ) {
				return;
			}

			event.preventDefault();
			void ( async () => {
				try {
					const { blob: fetchedBlob, mime: fetchedMime } =
						await fetchImageBlob( url );
					setName( getDefaultBaseName() );
					setBlob( fetchedBlob );
					setMime( fetchedMime );
					setOpen( true );
				} catch ( error ) {
					dispatch( 'core/notices' ).createErrorNotice(
						`Paste upload failed: ${ error?.message || error }`,
						{ isDismissible: true }
					);
				}
			} )();
		};

		const targets = new Set();
		const addTarget = ( doc ) => {
			if ( ! doc || targets.has( doc ) ) {
				return;
			}
			doc.addEventListener( 'paste', onPaste, true );
			targets.add( doc );
		};
		const addIframeTarget = () => {
			const iframe = document.querySelector(
				'iframe[name="editor-canvas"]'
			);
			const iframeDoc = iframe?.contentDocument;
			if ( iframeDoc ) {
				addTarget( iframeDoc );
			}
		};
		const observer = new MutationObserver( addIframeTarget );

		addTarget( document );
		addIframeTarget();
		observer.observe( document.documentElement, {
			childList: true,
			subtree: true,
		} );

		return () => {
			targets.forEach( ( doc ) =>
				doc.removeEventListener( 'paste', onPaste, true )
			);
			targets.clear();
			observer.disconnect();
		};
	}, [] );

	const closeModal = () => {
		if ( busy ) {
			return;
		}
		setOpen( false );
		setBlob( null );
		setAltText( '' );
		setMediaTitle( '' );
		setCaption( '' );
		setDescription( '' );
	};

	const uploadAndInsert = async () => {
		if ( ! blob ) {
			return;
		}

		setBusy( true );
		try {
			const ext = extFromMime( mime || blob.type );
			const base = sanitizeFilenameBase( name ) || getDefaultBaseName();
			const filename = `${ base }.${ ext }`;

			const file = new File( [ blob ], filename, {
				type: mime || blob.type || 'image/png',
			} );

			const formData = new FormData();
			formData.append( 'file', file, filename );

			const media = await apiFetch( {
				path: '/wp/v2/media',
				method: 'POST',
				body: formData,
			} );

			const updatePayload = {};
			if ( altText ) {
				updatePayload.alt_text = altText;
			}
			if ( mediaTitle ) {
				updatePayload.title = mediaTitle;
			}
			if ( caption ) {
				updatePayload.caption = caption;
			}
			if ( description ) {
				updatePayload.description = description;
			}
			if ( Object.keys( updatePayload ).length ) {
				await apiFetch( {
					path: `/wp/v2/media/${ media.id }`,
					method: 'POST',
					data: updatePayload,
				} );
			}

			const url = media?.source_url;
			if ( ! url ) {
				throw new Error( 'Upload succeeded but no URL returned.' );
			}

			const block = createBlock( 'core/image', {
				id: media.id,
				url,
				alt: altText || media?.alt_text || '',
				caption,
			} );
			dispatch( 'core/block-editor' ).insertBlocks( block );

			closeModal();
		} catch ( error ) {
			dispatch( 'core/notices' ).createErrorNotice(
				`Paste upload failed: ${ error?.message || error }`,
				{ isDismissible: true }
			);
		} finally {
			setBusy( false );
		}
	};

	const ext = extFromMime( mime || blob?.type );
	const base = sanitizeFilenameBase( name ) || getDefaultBaseName();
	const previewFilename = `${ base }.${ ext }`;

	return (
		<>
			{ isOpen && (
				<Modal
					title="Name pasted image"
					onRequestClose={ closeModal }
				>
					<div style={ { marginBottom: 16 } }>
						<div
							style={ {
								fontSize: 12,
								fontWeight: 600,
								letterSpacing: 0.3,
								textTransform: 'uppercase',
								color: '#1d2327',
								marginBottom: 6,
							} }
						>
							Presets
						</div>
						<ButtonGroup>
							{ getNameOptions().map( ( option ) => (
								<Button
									key={ option.label }
									variant="secondary"
									onClick={ () => setName( option.value ) }
									disabled={ busy }
									className={
										name === option.value ? 'is-selected' : undefined
									}
								>
									{ option.label }
								</Button>
							) ) }
						</ButtonGroup>
					</div>
					<TextControl
						label="Filename"
						value={ name }
						onChange={ setName }
						disabled={ busy }
						placeholder="example-image"
						help={
							hasExtension( name )
								? `You entered an extension; .${ ext } will still be added.`
								: undefined
						}
					/>
					<div
						style={ {
							marginTop: 6,
							marginBottom: 6,
							color: '#646970',
							fontSize: 12,
						} }
					>
						Final file: { previewFilename }
					</div>
					<TextControl
						label="Alternative Text"
						value={ altText }
						onChange={ setAltText }
						disabled={ busy }
					/>
					<TextControl
						label="Title"
						value={ mediaTitle }
						onChange={ setMediaTitle }
						disabled={ busy }
					/>
					<TextControl
						label="Caption"
						value={ caption }
						onChange={ setCaption }
						disabled={ busy }
					/>
					<TextControl
						label="Description"
						value={ description }
						onChange={ setDescription }
						disabled={ busy }
					/>
					<Flex justify="flex-end" gap={ 2 }>
						<FlexItem>
							<Button
								variant="tertiary"
								onClick={ closeModal }
								disabled={ busy }
							>
								Cancel
							</Button>
						</FlexItem>
						<FlexItem>
							<Button
								variant="primary"
								onClick={ uploadAndInsert }
								isBusy={ busy }
								disabled={ busy }
							>
								Upload and insert
							</Button>
						</FlexItem>
					</Flex>
				</Modal>
			) }
		</>
	);
}

registerPlugin( 'image-block-filename-prompt', { render: Plugin } );

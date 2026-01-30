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
			if ( ! imageItem ) {
				return;
			}

			event.preventDefault();

			const file = imageItem.getAsFile();
			if ( ! file ) {
				return;
			}

			setName( getDefaultBaseName() );
			setBlob( file );
			setMime( imageItem.type || file.type || 'image/png' );
			setOpen( true );
		};

		document.addEventListener( 'paste', onPaste, true );
		return () => document.removeEventListener( 'paste', onPaste, true );
	}, [] );

	const closeModal = () => {
		if ( busy ) {
			return;
		}
		setOpen( false );
		setBlob( null );
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

			const url = media?.source_url;
			if ( ! url ) {
				throw new Error( 'Upload succeeded but no URL returned.' );
			}

			const block = createBlock( 'core/image', {
				id: media.id,
				url,
				alt: media?.alt_text || '',
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

registerPlugin( 'gutenberg-image-filename-prompt', { render: Plugin } );

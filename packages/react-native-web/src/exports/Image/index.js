/**
 * Copyright (c) 2016-present, Nicolas Gallagher.
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import applyNativeMethods from '../../modules/applyNativeMethods';
import createElement from '../createElement';
import { getAssetByID } from '../../modules/AssetRegistry';
import ImageLoader from '../../modules/ImageLoader';
import ImageResizeMode from './ImageResizeMode';
import ImageSourcePropType from './ImageSourcePropType';
import ImageStylePropTypes from './ImageStylePropTypes';
import ImageUriCache from './ImageUriCache';
import StyleSheet from '../StyleSheet';
import StyleSheetPropType from '../../modules/StyleSheetPropType';
import View from '../View';
import ViewPropTypes from '../ViewPropTypes';
import { bool, func, number, oneOf, shape } from 'prop-types';
import React, { Component } from 'react';

const emptyObject = {};

const STATUS_ERRORED = 'ERRORED';
const STATUS_LOADED = 'LOADED';
const STATUS_LOADING = 'LOADING';
const STATUS_PENDING = 'PENDING';
const STATUS_IDLE = 'IDLE';

const getImageState = (uri, shouldDisplaySource) => {
  return shouldDisplaySource ? STATUS_LOADED : uri ? STATUS_PENDING : STATUS_IDLE;
};

const resolveAssetDimensions = source => {
  if (typeof source === 'number') {
    const { height, width } = getAssetByID(source);
    return { height, width };
  } else if (typeof source === 'object') {
    const { height, width } = source;
    return { height, width };
  }
};

const svgDataUriPattern = /^(data:image\/svg\+xml;utf8,)(.*)/;
const resolveAssetUri = source => {
  let uri = '';
  if (typeof source === 'number') {
    // get the URI from the packager
    const asset = getAssetByID(source);
    const scale = asset.scales[0];
    const scaleSuffix = scale !== 1 ? `@${scale}x` : '';
    uri = asset ? `${asset.httpServerLocation}/${asset.name}${scaleSuffix}.${asset.type}` : '';
  } else if (typeof source === 'string') {
    uri = source;
  } else if (source && typeof source.uri === 'string') {
    uri = source.uri;
  }

  if (uri) {
    const match = uri.match(svgDataUriPattern);
    // inline SVG markup may contain characters (e.g., #, ") that need to be escaped
    if (match) {
      const [, prefix, svg] = match;
      const encodedSvg = encodeURIComponent(svg);
      return `${prefix}${encodedSvg}`;
    }
  }

  return uri;
};

type State = {
  shouldDisplaySource: boolean
};

class Image extends Component<*, State> {
  static displayName = 'Image';

  static contextTypes = {
    isInAParentText: bool
  };

  static propTypes = {
    ...ViewPropTypes,
    defaultSource: ImageSourcePropType,
    draggable: bool,
    onError: func,
    onLayout: func,
    onLoad: func,
    onLoadEnd: func,
    onLoadStart: func,
    resizeMode: oneOf(Object.keys(ImageResizeMode)),
    source: ImageSourcePropType,
    style: StyleSheetPropType(ImageStylePropTypes),
    // compatibility with React Native
    /* eslint-disable react/sort-prop-types */
    blurRadius: number,
    capInsets: shape({ top: number, left: number, bottom: number, right: number }),
    resizeMethod: oneOf(['auto', 'resize', 'scale'])
    /* eslint-enable react/sort-prop-types */
  };

  static defaultProps = {
    style: emptyObject
  };

  static getSize(uri, success, failure) {
    ImageLoader.getSize(uri, success, failure);
  }

  static prefetch(uri) {
    return ImageLoader.prefetch(uri);
  }

  static resizeMode = ImageResizeMode;

  _imageRef = null;
  _imageRequestId = null;
  _imageState = null;
  _isMounted = false;

  constructor(props, context) {
    super(props, context);
    // If an image has been loaded before, render it immediately
    const uri = resolveAssetUri(props.source);
    const shouldDisplaySource = ImageUriCache.has(uri);
    this.state = { shouldDisplaySource };
    this._imageState = getImageState(uri, shouldDisplaySource);
  }

  componentDidMount() {
    this._isMounted = true;
    if (this._imageState === STATUS_PENDING) {
      this._createImageLoader();
    } else if (this._imageState === STATUS_LOADED) {
      this._onLoad({ target: this._imageRef });
    }
  }

  componentDidUpdate() {
    if (this._imageState === STATUS_PENDING) {
      this._createImageLoader();
    }
  }

  componentWillReceiveProps(nextProps) {
    const uri = resolveAssetUri(this.props.source);
    const nextUri = resolveAssetUri(nextProps.source);
    if (uri !== nextUri) {
      ImageUriCache.remove(uri);
      const isPreviouslyLoaded = ImageUriCache.has(nextUri);
      isPreviouslyLoaded && ImageUriCache.add(nextUri);
      this._updateImageState(getImageState(nextUri, isPreviouslyLoaded));
    }
  }

  componentWillUnmount() {
    const uri = resolveAssetUri(this.props.source);
    ImageUriCache.remove(uri);
    this._destroyImageLoader();
    this._isMounted = false;
  }

  render() {
    const { shouldDisplaySource } = this.state;
    const {
      accessibilityLabel,
      accessible,
      defaultSource,
      draggable,
      onLayout,
      source,
      testID,
      /* eslint-disable */
      blurRadius,
      capInsets,
      onError,
      onLoad,
      onLoadEnd,
      onLoadStart,
      resizeMethod,
      resizeMode,
      /* eslint-enable */
      ...other
    } = this.props;

    if (process.env.NODE_ENV !== 'production') {
      if (this.props.src) {
        console.warn('The <Image> component requires a `source` property rather than `src`.');
      }

      if (this.props.children) {
        throw new Error(
          'The <Image> component cannot contain children. If you want to render content on top of the image, consider using the <ImageBackground> component or absolute positioning.'
        );
      }
    }

    const selectedSource = shouldDisplaySource ? source : defaultSource;
    const displayImageUri = resolveAssetUri(selectedSource);
    const imageSizeStyle = resolveAssetDimensions(selectedSource);
    const backgroundImage = displayImageUri ? `url("${displayImageUri}")` : null;
    const flatStyle = { ...StyleSheet.flatten(this.props.style) };
    const finalResizeMode = resizeMode || flatStyle.resizeMode || ImageResizeMode.cover;
    // View doesn't support these styles
    delete flatStyle.overlayColor;
    delete flatStyle.resizeMode;
    delete flatStyle.tintColor;

    // Accessibility image allows users to trigger the browser's image context menu
    const hiddenImage = displayImageUri
      ? createElement('img', {
          alt: accessibilityLabel || '',
          draggable: draggable || false,
          ref: this._setImageRef,
          src: displayImageUri,
          style: styles.accessibilityImage
        })
      : null;

    return (
      <View
        {...other}
        accessibilityLabel={accessibilityLabel}
        accessible={accessible}
        onLayout={onLayout}
        style={[
          styles.root,
          this.context.isInAParentText && styles.inline,
          imageSizeStyle,
          flatStyle
        ]}
        testID={testID}
      >
        <View
          style={[
            styles.image,
            resizeModeStyles[finalResizeMode],
            backgroundImage && { backgroundImage }
          ]}
        />
        {hiddenImage}
      </View>
    );
  }

  _createImageLoader() {
    const { source } = this.props;
    this._destroyImageLoader();
    const uri = resolveAssetUri(source);
    this._imageRequestId = ImageLoader.load(uri, this._onLoad, this._onError);
    this._onLoadStart();
  }

  _destroyImageLoader() {
    if (this._imageRequestId) {
      ImageLoader.abort(this._imageRequestId);
      this._imageRequestId = null;
    }
  }

  _onError = () => {
    const { onError, source } = this.props;
    this._updateImageState(STATUS_ERRORED);
    if (onError) {
      onError({
        nativeEvent: {
          error: `Failed to load resource ${resolveAssetUri(source)} (404)`
        }
      });
    }
    this._onLoadEnd();
  };

  _onLoad = e => {
    const { onLoad, source } = this.props;
    const event = { nativeEvent: e };
    ImageUriCache.add(resolveAssetUri(source));
    this._updateImageState(STATUS_LOADED);
    if (onLoad) {
      onLoad(event);
    }
    this._onLoadEnd();
  };

  _onLoadEnd() {
    const { onLoadEnd } = this.props;
    if (onLoadEnd) {
      onLoadEnd();
    }
  }

  _onLoadStart() {
    const { onLoadStart } = this.props;
    this._updateImageState(STATUS_LOADING);
    if (onLoadStart) {
      onLoadStart();
    }
  }

  _setImageRef = ref => {
    this._imageRef = ref;
  };

  _updateImageState(status) {
    this._imageState = status;
    const shouldDisplaySource =
      this._imageState === STATUS_LOADED || this._imageState === STATUS_LOADING;
    // only triggers a re-render when the image is loading (to support PJEG), loaded, or failed
    if (shouldDisplaySource !== this.state.shouldDisplaySource) {
      if (this._isMounted) {
        this.setState(() => ({ shouldDisplaySource }));
      }
    }
  }
}

const styles = StyleSheet.create({
  root: {
    flexBasis: 'auto',
    overflow: 'hidden',
    zIndex: 0
  },
  inline: {
    display: 'inline-flex'
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    height: '100%',
    width: '100%',
    zIndex: -1
  },
  accessibilityImage: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    opacity: 0,
    width: '100%',
    zIndex: -1
  }
});

const resizeModeStyles = StyleSheet.create({
  center: {
    backgroundSize: 'auto'
  },
  contain: {
    backgroundSize: 'contain'
  },
  cover: {
    backgroundSize: 'cover'
  },
  none: {
    backgroundPosition: '0 0',
    backgroundSize: 'auto'
  },
  repeat: {
    backgroundPosition: '0 0',
    backgroundRepeat: 'repeat',
    backgroundSize: 'auto'
  },
  stretch: {
    backgroundSize: '100% 100%'
  }
});

export default applyNativeMethods(Image);

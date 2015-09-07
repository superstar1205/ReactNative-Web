import { pickProps } from '../../modules/filterObjectProps'
import CoreComponent from '../CoreComponent'

export default {
  ...pickProps(CoreComponent.stylePropTypes, [
    'alignContent',
    'alignItems',
    'alignSelf',
    'backfaceVisibility',
    // background
    'backgroundAttachment',
    'backgroundClip',
    'backgroundColor',
    'backgroundImage',
    'backgroundPosition',
    'backgroundOrigin',
    'backgroundRepeat',
    'backgroundSize',
    // border-color
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    // border-radius
    'borderRadius',
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomLeftRadius',
    'borderBottomRightRadius',
    // border style
    'borderStyle',
    'borderBottomStyle',
    'borderLeftStyle',
    'borderRightStyle',
    'borderTopStyle',
    // border width
    'borderWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderRightWidth',
    'borderTopWidth',
    'bottom',
    'boxShadow',
    'boxSizing',
    'cursor',
    'flexBasis',
    'flexDirection',
    'flexGrow',
    'flexShrink',
    'flexWrap',
    'height',
    'justifyContent',
    'left',
    // margin
    'margin',
    'marginBottom',
    'marginLeft',
    'marginRight',
    'marginTop',
    // max/min
    'maxHeight',
    'maxWidth',
    'minHeight',
    'minWidth',
    'opacity',
    'order',
    'overflow',
    'overflowX',
    'overflowY',
    // padding
    'padding',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'position',
    'right',
    'top',
    'transform',
    'userSelect',
    'visibility',
    'width',
    'zIndex'
  ])
}

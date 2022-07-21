import {LightningElement, api} from 'lwc';
import './button.scss';
import {UTILS} from "../../c/utils/utils";

const ATTRIBUTES = {
    SIZE: {
        SMALL: 'small',
        MEDIUM: 'medium',
        LARGE: 'large',
    },
    VARIANT: {
        GOLD: 'gold',
        GRAY: 'gray'
    }
};

export default class Button extends LightningElement {
    static renderMode = 'light';

    @api styleClass;
    @api disabled;
    @api size;
    @api variant;
    @api href;

    focused;

    handleFocus() {
        this.focused = true;
    }

    handleBlur() {
        this.focused = false;
    }

    connectedCallback () {
        this.addEventListener('click', event => {
            if (this.disabled) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        });
    }

    get computedButtonClass () {
        let config = {
            'button-disabled': this.disabled,
            'button-required': this.required,
            'button-size_small': this.normalizedSize === ATTRIBUTES.SIZE.SMALL,
            'button-size_medium': this.normalizedSize === ATTRIBUTES.SIZE.MEDIUM,
            'button-size_large': this.normalizedSize === ATTRIBUTES.SIZE.LARGE,
            'button-variant_base': true,
            'button-variant_gold': this.normalizedVariant === ATTRIBUTES.VARIANT.GOLD,
            'button-variant_gray': this.normalizedVariant === ATTRIBUTES.VARIANT.GRAY,
            'button-variant_gold_focused': this.normalizedVariant === ATTRIBUTES.VARIANT.GOLD && this.focused,
            'button-variant_gray_focused': this.normalizedVariant === ATTRIBUTES.VARIANT.GRAY && this.focused
        };
        
        config[this.styleClass] = this.styleClass;
        return UTILS.configToString(config);
    }

    get computedHref () {
        return this.href;
    }

    get normalizedSize () {
        return UTILS.normalizeString(this.size, {
            fallbackValue: ATTRIBUTES.SIZE.MEDIUM,
            validValues: [
                ATTRIBUTES.SIZE.SMALL,
                ATTRIBUTES.SIZE.MEDIUM,
                ATTRIBUTES.SIZE.LARGE,
            ]
        });
    }

    get normalizedVariant () {
        return UTILS.normalizeString(this.variant, {
            fallbackValue: ATTRIBUTES.VARIANT.GOLD,
            validValues: [
                ATTRIBUTES.VARIANT.GOLD,
                ATTRIBUTES.VARIANT.GRAY
            ]
        });
    }
}
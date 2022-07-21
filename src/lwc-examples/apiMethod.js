import BaseComponent from 'c/baseComponent';
import {api} from 'lwc';
import {REST} from 'root/rest';
import './addressLookupComponent.scss';

export default class addressLookupComponent extends BaseComponent {
    loading;
    typing;
    addressesData;
    lookupVisible;
    postcodeValue;
    _errorVisible = false;
    _dataRequestError = false;
    typingTimeout;

    @api required;
    @api valueSelected = false;
    @api label;
    @api maxLength;
    @api invalidInputErrorMessage;
    @api emptyFieldErrorMessage;

    @api
    getValidity(silently = false) {
        const inputElement = this.querySelector("ui-input");

        if (!silently) {
            const inputValidity = inputElement.getValidity();

            if (!inputValidity) return false;

            inputElement.hideError();
            this._errorVisible = this.required && !this.valueSelected && !silently;

            if (this._errorVisible) inputElement.showApiError();
        }

        return this.required ? this.valueSelected : true;
    }

    @api
    set postcode(value) {
        this.postcodeValue = value;
        this.valueSelected = !!value;
    }

    get postcode() {
        return this.postcodeValue;
    }

    get regexp() {
        if (this.valueSelected) {
            return "";
        } else {
            return '^$';
        }
    }

    get isStatusVisible() {
        return this.typing || this.loading || !this.addressesData?.length;
    }

    get currentStatus() {
        if (this.typing) return this.content.ETE_common_components_translations.typing;
        if (this.loading) return this.content.ETE_common_components_translations.loading;
        if (this._dataRequestError) return this.settings?.default_settings.addressLookupComponentSettings.dataRequestError;
        if (!this.addressesData?.length) {
            return this.settings?.default_settings.addressLookupComponentSettings.resultsNotFound;
        }

        return '';
    }

    addressNameChangeHandler() {
        if (!this.lookupVisible) {
            this.lookupVisible = true;
        } else {
            this.valueSelected = false;
        }

        clearTimeout(this.typingTimeout);
        this.typing = true;
        this.typingTimeout = setTimeout(() => this.addressDataRequest(), 500);
    }

    handleBlur() {
        if (this.lookupVisible) {
            setTimeout(() => {
                this.lookupVisible = false;
                this.dispatchEvent(new CustomEvent('blur'));
            }, 250);
        } else {
            this.dispatchEvent(new CustomEvent('blur'));
        }
    }

    handleInput(event) {
        this.valueSelected = false;
        this.hideError();
        this.postcodeValue = event.currentTarget.value;
        this.addressNameChangeHandler();

        this.dispatchEvent(new CustomEvent('change'));
    }

    handleClick(event) {
        this.postcodeValue = event.currentTarget.value;
        if (this.postcodeValue) {
            this.hideError();
            if (!this.lookupVisible) {
               this.lookupVisible = true;
            } else {
               this.valueSelected = false;
            }
        }

        this.dispatchEvent(new CustomEvent('click', {}));
    }

    handleAddressSelected(e) {
        this.lookupVisible = false;
        this.hideError();

        this.addressInformationRequest(e.detail)
            .then(result => {
                const postcode = result.fields.find(item => item.id === 'Postcode');
                this.postcodeValue = postcode.content;
            })

        this.dispatchEvent(new CustomEvent('select', {
            detail: e.detail
        }));
    }

    hideError() {
        if (!this._errorVisible) return;

        this.querySelector("ui-input").hideError();
        this._errorVisible = false;
    }

    async addressInformationRequest(addressData) {
        let result = await REST.getAddressInformation(this.user.source, this.user.countryCode, this.user.implKey, addressData.id, this);

        this.dispatchEvent(new CustomEvent('input', {
            detail: result
        }));

        this.valueSelected = true;

        return result;
    }

    async addressDataRequest() {
        this.typing = false;
        this.addressesData = [];
        this._dataRequestError = false;

        if (!this.postcodeValue) return;

        this.loading = true;
        let result = await REST.getAddressLookup(this.user.source, this.user.countryCode, this.user.implKey, this.postcodeValue, this);

        if (!result) {
            this.loading = false;
            return;
        }

        if (result.hasOwnProperty("results") && result.hasOwnProperty("count") && result.count > 0) {
            this._dataRequestError = false;
            this.addressesData = result.results;
        } else if (result?.timeout || (result.hasOwnProperty("status") && result.status.success === false)) {
            this._dataRequestError = true;
        }

        this.loading = false;
    }
}
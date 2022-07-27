import {LightningElement, api} from 'lwc';
import './input.scss';
import {UTILS} from "../../c/utils/utils";

export default class Input extends LightningElement {
    valid;
    _value = '';
    _regExp;
    connected;

    @api checkOnInput;
    @api required;
    @api minValue;
    @api maxValue
    @api isEmptyFieldValid = false;

    //child public method
    @api
    getValidity(silently = false, ignoreEmptyFields = false) {
        if (silently) return this.checkIsValid(ignoreEmptyFields);

        this.checkOnInput = true;
        this.setValidity();

        return this.valid;
    }

    //accessibility
    @api
    focus() {
        this.querySelector('input').focus();
    }

    checkIsValid(ignoreEmptyFields = false) {
        const isRequired = UTILS.normalizeBoolean(this.required);
        const trimmedValue = this._value.trim();
        const isEmpty = !trimmedValue.length;

        if (isEmpty && this.isEmptyFieldValid) return true;
        if (isEmpty && ignoreEmptyFields) return true;
        if (isEmpty && isRequired) return false;
        if (isEmpty) return true;

        const normalizedMinValue = UTILS.normalizeInteger(this.minValue);
        const normalizedMaxValue = UTILS.normalizeInteger(this.maxValue);
        const isInRange = UTILS.isInRange(this._value, normalizedMinValue, normalizedMaxValue);

        if (!isInRange) return false;
        if (!this._regExp) return true;

        return new RegExp(this._regExp).test(trimmedValue);
    }

    setValidity() {
        if (!this.connected) {
            return;
        }

        this.valid = this.checkIsValid();
        this.setErrorMessage();
    }
}
import BaseComponent from 'c/baseComponent';
import './paymentTerms.scss';
import {api} from "lwc";

export default class PaymentTerms extends BaseComponent {
    //public property
    @api offer;

    //dispatch event
    selectOfferHandler(){
        this.dispatchEvent(new CustomEvent('paymenttermschange', {
            detail: this.offer
        }));
    }
}
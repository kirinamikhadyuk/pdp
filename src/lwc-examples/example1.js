import './stepYourOffer.scss';
import TMPL_BASE from './tmpl_base.html';
import TMPL_ACCEPT from './tmpl_accept.html';
import TMPL_UNAVAILABLE from './tmpl_unavailable.html';
import TMPL_CREDIT_BUILDER from './tmpl_creditbuilder.html';

export default class StepYourOffer{
    state;

    //data binding
    get depositValue() {
        return this.state === CONSTANTS.STATES.CREDIT_BUILDER_HYBRID ? 0 :
            this.user.offerItems[0]?.securityAmountToPay || 0;
    };

    //render multiply
    render() {
        let template;
        switch (this.state) {
            case CONSTANTS.STATES.ACCEPT:
            case CONSTANTS.STATES.CREDIT_BUILDER_HYBRID:
            case CONSTANTS.STATES.ACCEPT_BOND:
                template = TMPL_ACCEPT;
                break;
            case CONSTANTS.STATES.CREDIT_BUILDER:
            case CONSTANTS.STATES.CREDIT_BUILDER_BOND:
                template = TMPL_CREDIT_BUILDER;
                break;
            case CONSTANTS.STATES.UNAVAILABLE:
                template = TMPL_UNAVAILABLE;
                break;
            default:
                template = TMPL_BASE;
                break;
        }
        return template;
    }

    //query selector
    renderedCallback() {
        if (!this.businessAddressFoundViaLookup) {
            this.querySelector('[data-name="switchButtonContainer"]')?.classList.add("step-about-you__max-flex");
        }
    }

    //lifecycle
    connectedCallback() {
        if (this.user.appSubmitter && !this.user.offerItems[0]?.paymentType) {
            this.USER.setState({
                isUserChanged: true
            });

            this.USER.clearPaymentTermsData();
            this.USER.clearPricingOptionsData();
        }

        GA.sendCurrentFormToGA('PERSONAL');
    }

    //method call child method getValidity()
    getStepData() {
        return UTILS.collectDataForElements(this, [
            this.CONSTANTS.ELEMENTS.INPUT
        ]);
    }

    //handle event from child
    handlePaymentTerms(event) {
        const selectedOffer = event.detail;

        if (this.isCreditBuilderHybridActive && selectedOffer?.bondType === BOND_TYPES.PARTIAL) {
            this.state = CONSTANTS.STATES.CREDIT_BUILDER_HYBRID;
        } else if (!this.isCreditBuilderHybridActive && selectedOffer?.bondType === BOND_TYPES.PARTIAL) {
            this.state = CONSTANTS.STATES.ACCEPT_BOND;
        } else if (selectedOffer?.bondType === BOND_TYPES.NONE) {
            this.state = CONSTANTS.STATES.ACCEPT;
        }
    }

    //event propagation
    showModal(title, description) {
        this.dispatchEvent(new CustomEvent('showerrormodal', {
            detail: {
                title: title,
                description: description,
                modalTemplate: 'error'
            },
            bubbles: true,
            composed: true
        }));
    }
}
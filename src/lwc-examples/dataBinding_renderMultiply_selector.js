import './stepYourOffer.scss';
import TMPL_BASE from './tmpl_base.html';
import TMPL_ACCEPT from './tmpl_accept.html';
import TMPL_UNAVAILABLE from './tmpl_unavailable.html';
import TMPL_CREDIT_BUILDER from './tmpl_creditbuilder.html';
import {REST} from "root/rest";
import {GA, STEP, UTILS} from "../../c/utils/utils";
import BaseStep from "../baseStep/baseStep";
import CONSTANTS from "core/constants";

const BOND_TYPES = {
    CREDIT_BUILDER: 'CREDIT_BUILDER',
    NONE: 'NONE',
    FULL: 'FULL',
    PARTIAL: 'PARTIAL'
};

const PAYMENT_TERM_CREDIT_BUILDER = 'CreditBuilder';

export default class StepYourOffer extends BaseStep {
    state;
    offers;
    pricingOptions;
    creditBuilderOfferGroups;
    creditBuilderInitialOfferGroups;
    creditBuilderOffers;
    pricingOptionTitle;
    productName;
    offerConfiguration = {};
    stepError;
    isCreditBuilderHybridActive = false;

    get depositValue() {
        return this.state === CONSTANTS.STATES.CREDIT_BUILDER_HYBRID ? 0 :
            this.user.offerItems[0]?.securityAmountToPay || 0;
    };

    get creditBuilderTitle() {
        return UTILS.formatString(this.content.ETE_STEP_your_offer.credit_builder_step_title, this.user.offerItems[0]?.offerName);
    }

    get nextButtonActive() {
        return this.checkStepValidity();
    }

    get selectedCompanyTypeSettings() {
        return this.settings?.business_settings.business_types.find(item => item.label === this.user.selectedCompanyName);
    }

    get baseTemplateTitle() {
        return this.selectedCompanyTypeSettings.isCreditCheckNeeded ? this.content.ETE_STEP_your_offer.step_title : this.content.ETE_STEP_your_offer.no_credit_check_step_title;
    }

    get baseTemplateSubtitle() {
        return this.selectedCompanyTypeSettings.isCreditCheckNeeded ? this.content.ETE_STEP_your_offer.step_subtitle : this.content.ETE_STEP_your_offer.no_credit_check_step_subtitle;
    }

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

    async baseConnectedCallback() {
        if (!this.state && !this.user.eteCreditOfferType && this.user.offerItems?.length === 0 && !this.user.offerConfiguration) {
            this.state = CONSTANTS.STATES.DECLINE;
            return;
        }

        this.state = this.user.eteCreditOfferType;

        if (this.USER.state.isUserChanged) {
            this.state = null;
        }

        if (this.user.offerConfiguration && !this.USER.state.isUserChanged && this.state !== CONSTANTS.STATES.DECLINE) {
            this.restoreOffers();
        } else if (!this.state) {
            GA.sendCurrentFormToGA('OFFER-CALCULATING');
            this.dispatchEvent(new CustomEvent('disable', {bubbles: true}));

            if (!this.selectedCompanyTypeSettings.isCreditCheckNeeded) {
                if (this.USER.requestPromise) {
                    this.USER.requestPromise.then(async () => {
                        const promos = await REST.getPromos(this.settings?.default_settings.availableOffers);
                        this.buildPromos(promos.promos);

                        this.state = CONSTANTS.STATES.UNAVAILABLE;
                        this.USER.update({
                            eteCreditOfferType: this.state,
                            eteFinishScreen: this.state
                        });

                        this.USER.initState();
                        this.submitModel(false);
                    })
                }
            } else {
                this.calculateCredit();
            }
        }

        this.assignStep();
    }

    renderedCallback() {
        const stepSubtitle = this.querySelector('.step-your-offer__subtitle');
        if (stepSubtitle) {
            stepSubtitle.innerHTML = UTILS.formatString(this.content.ETE_STEP_your_offer.accept_step_subtitle, this.calculateMonthlySpend());
        }
    }

    handleNext() {
        this.stepError = !this.checkStepValidity();

        if (!this.stepError) {
            this.submitModel();
            this.USER.goToNextStep();
        }
    }

    handlePaymentTerms(event) {
        const selectedOffer = event.detail;
        this.offers = this.offers.map(offer => {
            return {...offer, selected: offer.id === selectedOffer.id};
        });

        if (this.isCreditBuilderHybridActive && selectedOffer?.bondType === BOND_TYPES.PARTIAL) {
            this.state = CONSTANTS.STATES.CREDIT_BUILDER_HYBRID;
        } else if (!this.isCreditBuilderHybridActive && selectedOffer?.bondType === BOND_TYPES.PARTIAL) {
            this.state = CONSTANTS.STATES.ACCEPT_BOND;
        } else if (selectedOffer?.bondType === BOND_TYPES.NONE) {
            this.state = CONSTANTS.STATES.ACCEPT;
        }

        this.USER.update({
            eteCreditOfferType: this.state,
            eteFinishScreen: this.state === CONSTANTS.STATES.CREDIT_BUILDER_BOND || this.state === CONSTANTS.STATES.ACCEPT_BOND
                ? CONSTANTS.STATES.ACCEPT
                : this.state
        });

        this.updateUserPaymentTerms(selectedOffer);
        this.stepError = this.stepError ? !this.checkStepValidity() : false;
    }

    handleDeselectPaymentTerms(event) {
        this.USER.clearPaymentTermsData();

        this.offers = this.offers.map(offer => {
            return {...offer, selected: false};
        });
    }

    handlePaymentTermSelect(event) {
        const selectedPaymentTerm = this.creditBuilderOffers.find(opt => opt.id === event.detail.offerId);

        if (this.state === CONSTANTS.STATES.CREDIT_BUILDER && selectedPaymentTerm.bondType !== BOND_TYPES.CREDIT_BUILDER) {
            this.state = CONSTANTS.STATES.CREDIT_BUILDER_BOND;
        } else if (this.state === CONSTANTS.STATES.CREDIT_BUILDER_BOND && selectedPaymentTerm.bondType === BOND_TYPES.CREDIT_BUILDER) {
            this.state = CONSTANTS.STATES.CREDIT_BUILDER;
        }

        this.USER.update({
            eteCreditOfferType: this.state,
            eteFinishScreen: this.state === CONSTANTS.STATES.CREDIT_BUILDER_BOND || this.state === CONSTANTS.STATES.ACCEPT_BOND
                ? CONSTANTS.STATES.ACCEPT
                : this.state
        });
        this.updateUserPaymentTerms(selectedPaymentTerm);
        this.updatePaymentTermsOptions(event.detail.offerId);
        this.stepError = false;
    }

    handleSelect(event) {
        const offers = this.user.offerItems;
        offers[0].pricingOptionId = event.detail.optionId;
        offers[0].pricingOptionTitle = event.detail.title;
        offers[0].pricingOptionCardFamily = event.detail.cardFamily;

        this.USER.update({
            offerItems: offers
        });

        this.stepError = this.stepError ? !this.checkStepValidity() : false;
        this.updatePricingOptions();
    }

    handlePaymentTermDeselect() {
        const offers = this.user.offerItems;
        offers[0].creditLimitOffer = null;
        offers[0].securityAmountToPay = null;

        this.USER.update({
            offerItems: offers
        });

        this.creditBuilderOfferGroups = this.creditBuilderInitialOfferGroups;
    }

    handleDeselect() {
        const offers = this.user.offerItems;
        offers[0].pricingOptionId = null;
        offers[0].pricingOptionTitle = null;
        offers[0].pricingOptionCardFamily = null;

        this.USER.update({
            offerItems: offers
        });

        this.updatePricingOptions();
    }

    calculateMonthlySpend() {
        return (Math.floor(this.user.offerItems[0].creditLimitOffer * 52 / 12 / 100) * 100).toLocaleString("en-GB");
    }

    restoreOffers() {
        const offerConfigurationParsed = JSON.parse(this.user.offerConfiguration);

        if (this.state === CONSTANTS.STATES.CREDIT_BUILDER || this.state === CONSTANTS.STATES.CREDIT_BUILDER_BOND
            || (offerConfigurationParsed.creditBuilderOfferGroups || offerConfigurationParsed.creditBuilderOffers)) {
            this.creditBuilderOfferGroups = offerConfigurationParsed.creditBuilderOfferGroups;
            this.creditBuilderOffers = offerConfigurationParsed.creditBuilderOffers;
            this.creditBuilderInitialOfferGroups = this.creditBuilderOfferGroups;

            this.checkSelectedTerm();
        } else {
            this.offers = offerConfigurationParsed.paymentTerms;
            this.isCreditBuilderHybridActive = this.settings?.ETE_settings?.bondPaymentOption === PAYMENT_TERM_CREDIT_BUILDER &&
                this.offers?.find(offer => offer.bondType === BOND_TYPES.PARTIAL);

            this.updatePaymentTerms();
        }

        this.pricingOptions = offerConfigurationParsed.pricingOptions;
        this.updatePricingOptions();
    }

    buildPromos(promos) {
        this.pricingOptions = promos.map(option => {
            return {
                id: option.source,
                title: option.promoTitle,
                info: option.description.join('. '),
                additionalInfo: option.additionalInfo,
                cardFamily: option.cardFamily
            }
        });

        this.offerConfiguration.pricingOptions = this.pricingOptions;
        this.USER.update({
            offerConfiguration: JSON.stringify(this.offerConfiguration)
        });

        this.productName = this.pricingOptions[0].cardFamily;
        this.setPricingOptionTitle();

        if (!this.pricingOptions?.length) {
            const errorTitle = this.content.ETE_STEP_your_offer.pricing_option_error_title;
            const errorDescription = UTILS.formatString(this.content.ETE_STEP_your_offer.pricing_option_error_description, this.productName);
            this.showModal(errorTitle, errorDescription);
        }

        if (this.user.offerItems[0].pricingOptionId) {
            this.stepError = false;
            this.updatePricingOptions();
        }
    }

    setPricingOptionTitle() {
        this.pricingOptionTitle = this.productName ?
            UTILS.formatString(this.content.ETE_STEP_your_offer.pricing_option_title, this.productName) :
            UTILS.formatString(this.content.ETE_STEP_your_offer.pricing_option_title, this.settings?.ETE_Offers_settings.offers[0].offerName);
    }

    calculateCredit() {
        this.USER.update({
            hasMonthlyNonFuelSpend: false,
            premiumOptOut: false,
            monthlyNonFuelSpend: 0,
            monthlyFuelSpend: this.user.maxCreditLimit
        });

        const offerConfig = this.user.offerConfiguration;

        if (this.USER.requestPromise) {
            this.USER.requestPromise?.then((result) => {
                if (!result?.submitDone && !STEP.doCheckRequestPromise(this)) {
                    this.calculateCredit();
                    return;
                }
                if (!this.user.isCustomer && (this.USER.state.isUserChanged || !offerConfig)) {
                    this.sendCreditRequest();
                    this.USER.initState();
                }
            });
        } else if (this.USER.state.isUserChanged || !offerConfig) {
            this.sendCreditRequest();
            this.USER.initState();
        }
    }

    async sendCreditRequest() {
        if (this.user?.owners?.length) {
            this.USER.update({
                hasMonthlyNonFuelSpend: true,
                premiumOptOut: true
            });
        }

        let response = await REST.fetchCreditDecisionOffers(this.user, this.user.countryCode, this.user.currentStep,
            this.settings?.default_settings.availableOffers, this);

        if (response.promos) {
            this.buildPromos(response.promos);
        }

        this.state = response.timeout ? CONSTANTS.STATES.UNAVAILABLE : response.state;

        if (this.state === CONSTANTS.STATES.DECLINE) {
            GA.sendCurrentFormToGA('DECLINE');
        }

        if (this.state === CONSTANTS.STATES.CREDIT_BUILDER) {
            this.creditBuilderOfferGroups = response.offerGroups;
            this.creditBuilderInitialOfferGroups = response.offerGroups;
            this.creditBuilderOffers = response.offers;
            this.offerConfiguration.creditBuilderOfferGroups = response.offerGroups;
            this.offerConfiguration.creditBuilderOffers = response.offers;

            if (this.user.offerItems[0]?.creditLimitOffer) {
                this.checkSelectedTerm();
            }
        }

        if (this.state === CONSTANTS.STATES.ACCEPT || this.state === CONSTANTS.STATES.ACCEPT_BOND) {
            const partialTypeOffer = response?.offers?.find(offer => offer.bondType === BOND_TYPES.PARTIAL);

            if (partialTypeOffer && this.settings?.ETE_settings?.bondPaymentOption === PAYMENT_TERM_CREDIT_BUILDER) {
                this.state = CONSTANTS.STATES.CREDIT_BUILDER_HYBRID;
                this.isCreditBuilderHybridActive = true;
            } else {
                this.isCreditBuilderHybridActive = false;
            }
            this.offers = response.offers.map((offer, index) => {
                const creditGiven = offer.creditLimitOffer - offer.bondAmount;
                let selected = index == 0;
                if (index == 0 && !this.user.offerItems[0]?.creditLimitOffer && !this.isCreditBuilderHybridActive) {
                    this.updateUserPaymentTerms(offer);
                } else {
                    selected = (
                        this.user.offerItems[0]?.paymentTermsExternalId === offer.id
                    );
                }
                return {
                    ...offer,
                    creditGiven: creditGiven,
                    paymentMethod: this.content.ETE_STEP_your_offer.payment_method,
                    selected: this.isCreditBuilderHybridActive ? false : selected
                };
            });

            this.offerConfiguration.paymentTerms = this.offers;
        }

        this.USER.initState();
        this.USER.update({
            eteCreditOfferType: this.state,
            offerConfiguration: JSON.stringify(this.offerConfiguration),
            eteFinishScreen: this.state === CONSTANTS.STATES.CREDIT_BUILDER_BOND || this.state === CONSTANTS.STATES.ACCEPT_BOND
                ? CONSTANTS.STATES.ACCEPT
                : this.state,
            isCreditDecisionTimeout: response.timeout
        });
        GA.sendCurrentFormToGA('OFFER');

        this.submitModel(false);
    }

    async sendNewRefer() {
        let result = await REST.newFetchCreditDecisionOffers(this.user, this.user.countryCode, this.user.currentStep, this.user.currentSubStep, this);
    }

    checkSelectedTerm() {
        const selectedOffer = this.creditBuilderOffers.find(offer =>
            this.user.offerItems[0]?.paymentTermsExternalId === offer.id
        );
        if (selectedOffer?.id) this.updatePaymentTermsOptions(selectedOffer.id);
    }

    updateUserPaymentTerms(offer = {}) { //static relationship with first product
        const offers = this.user.offerItems;

        offers[0].paymentMethod = offer.paymentMethod;
        offers[0].paymentTerms = offer.term;
        offers[0].creditLimitOffer = offer.creditLimitOffer;
        offers[0].securityAmountToPay = this.state === CONSTANTS.STATES.CREDIT_BUILDER_HYBRID ? 0 : offer.bondAmount;
        offers[0].paymentTermsExternalId = offer.id;
        offers[0].paymentType = offer.bondType;

        this.USER.update({
            offerItems: offers
        });
    }

    updatePaymentTermsOptions(offerId) {
        this.creditBuilderOfferGroups = this.creditBuilderOfferGroups.map(option => {
            return {
                ...option,
                selected: offerId === option.defaultOfferId
            };
        });
    }

    updatePricingOptions() {
        const offer = this.user.offerItems[0];
        this.pricingOptions = this.pricingOptions.map(option => {
            return {
                ...option,
                selected: option.id === offer.pricingOptionId || (offer.pricingOptionTitle === option.title && offer.pricingOptionCardFamily === option.cardFamily)
            };
        });
        this.setPricingOptionTitle();
    }

    updatePaymentTerms() {
        const offer = this.user.offerItems[0];
        this.offers = this.offers?.map((term) => {
            const selected = offer?.paymentTermsExternalId === term?.id;

            if (selected) this.updateUserPaymentTerms(term);

            return {
                ...term,
                selected: selected
            }
        });
    }

    submitModel(nextStepSwitchNeeded = true) {
        const offers = this.user.offerItems;

        if (nextStepSwitchNeeded === false) {
            this.USER.update({
                offerItems: []
            });
        }

        this.USER.update({
            eteCreditOfferType: this.state,
            currentSubStep: '',
            eteFinishScreen: this.state === CONSTANTS.STATES.CREDIT_BUILDER_BOND || this.state === CONSTANTS.STATES.ACCEPT_BOND
                ? CONSTANTS.STATES.ACCEPT
                : this.state
        });
        STEP.doSendModel(this, this.user.currentStep, this.user.currentSubStep, nextStepSwitchNeeded);

        if (nextStepSwitchNeeded === false) {
            this.USER.update({
                offerItems: offers
            });
        }
    }

    checkStepValidity() {
        if (this.state === CONSTANTS.STATES.CREDIT_BUILDER || this.state === CONSTANTS.STATES.CREDIT_BUILDER_BOND) {
            return !!this.creditBuilderOfferGroups
                ? !!this.creditBuilderOfferGroups.find(offer => offer.selected === true)
                : !!this.offers.find(offer => offer.selected === true);
        } else if (this.isCreditBuilderHybridActive) {
            return !!this.offers.find(offer => offer.selected === true) && !!this.user.offerItems[0]?.pricingOptionId;
        } else {
            return !!this.user.offerItems[0]?.pricingOptionId;
        }
    }
}
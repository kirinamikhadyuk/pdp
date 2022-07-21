import {REST, STATUSES} from 'root/rest';
import './stepAboutYou.scss';
import {GA, UTILS} from "../../c/utils/utils";
import BaseStep from "../baseStep/baseStep";

const AVAILABLE_FIELDS = [
    'salutation',
    'firstName',
    'lastName',
    'phone',
    'email',
    'selectedCompanyName',
    'companyName',
    'companyShortNameLookup',
    'companyPostcode',
    'street',
    'city',
    'state',
    'postcodeLookup'
];

const DEDUP_CHECK_FIELDS = [
    'phone',
    'email',
    'companyName',
    'street',
    'city',
    'state'
];

const ADDRESS_FIELD_MAPPING = {
    Postcode: "companyPostcode",
    Street: "street",
    Town: "city",
    County: "state",
    HouseName: "houseName",
    HouseNumber: "houseNumber",
};

const FETCH_CHECK_FIELDS = [
    'companyName'
];

export default class StepAboutYou extends BaseStep {
    AVAILABLE_FIELDS = AVAILABLE_FIELDS;
    DEDUP_CHECK_FIELDS = DEDUP_CHECK_FIELDS;
    ADDRESS_FIELD_MAPPING = ADDRESS_FIELD_MAPPING;
    FETCH_CHECK_FIELDS = FETCH_CHECK_FIELDS;

    proofOfBusinessAddressVisible = false;
    companyPostcode;
    houseName;
    houseNumber;
    street;
    city;
    state;
    manualStyling;
    lookupVisible;
    previousCompanyNameValue;
    selectedCompany;
    companiesData;
    businessAddressFoundViaLookup;
    notSelectedCompanyNameErrorMessage;
    companyNameErrorMessage;
    companyName;
    companyNameRegex;
    companyNameLabel;
    companyType;
    companySearchByType;
    selectedAddressRender;
    isManualEntryPossible;
    isConnected;
    locationLine;
    stepError;

    _bindModalCloseEventHandler;
    _selectedData;

    get errorText() {
        return this.USER.isAddressSearchActive ? this.content.ETE_STEP_about_you.address_loading_warning : this.content.ETE_STEP_about_you.nextButton_error_cd;
    }

    get buttonLabel() {
        return this.businessAddressFoundViaLookup ?
            this.content.ETE_STEP_about_you.proof_of_business_address_cant_find_address :
            this.content.ETE_STEP_about_you.proof_of_business_address_search_for_address;
    }

    get isAddressLabelVisible() {
        return this.businessAddressFoundViaLookup && this._selectedData;
    }

    get showCompanyPart() {
        return !!this.user.currentSubStep;
    }

    get companyInputDisabled() {
        return !this.user.selectedCompanyName;
    }

    renderedCallback() {
        if (!this.isConnected && !this.user.currentSubStep) {
            this.isConnected = true;
            this._bindModalCloseEventHandler = this.changeAddressSearchToManual.bind(this);
            document.addEventListener('modalclose', this._bindModalCloseEventHandler);

            this.locationLine = this.setAddressLine(this.user.houseName, this.user.houseNumber, this.user.street);
        }

        const privacyElement = this.querySelector('.step-about-you__privacy-bottom-text');
        if (privacyElement) {
            privacyElement.innerHTML = this.content.ETE_STEP_about_you.privacy_bottom_text;
        }

        if (!this.businessAddressFoundViaLookup) {
            this.querySelector('[data-name="switchButtonContainer"]')?.classList.add("step-about-you__max-flex");
        }

        if (this.manualStyling) {
            this.manualStyling = false;
            const switchButton = this.querySelector('[data-name="switchButtonContainer"]');
            if (switchButton && !switchButton.classList.contains("step-about-you__max-flex")) {
                switchButton.classList.toggle("step-about-you__max-flex");
            }
        }

        if (this._selectedData && !this.selectedAddressRender) {
            this.selectedAddressRender = true;
            this.stepErrorCheck();
        }
    }

    baseConnectedCallback() {
        if (this.user.selectedCompanyName) {
            this.changeBusinessTypePostActions();
        }

        if (this.user.companyPostcode) {
            this.restoreCompanyAddress();
        }

        if (this.user.appSubmitter && !this.user.offerItems[0]?.paymentType) {
            this.USER.setState({
                isUserChanged: true
            });

            this.USER.clearPaymentTermsData();
            this.USER.clearPricingOptionsData();
        }

        this.companyName = this.user.companyName;
        this.companyNameLabel = this.companyNameLabel ?? this.content.ETE_STEP_about_you.company_label;
        this.companyNameErrorMessage = UTILS.formatString(this.content.ETE_STEP_about_you.companyName_emptyField_error_cd, 'company');

        this.assignStep();
        GA.sendCurrentFormToGA('PERSONAL');
    }

    restoreCompanyAddress() {
        this.companyPostcode = this.user.companyPostcode;
        this.houseName = this.user.houseName;
        this.houseNumber = this.user.houseNumber;
        this.street = this.user.street;
        this.city = this.user.city;
        this.state = this.user.state;

        this.proofOfBusinessAddressVisible = !this.user.companyFoundViaLookup;
        this.businessAddressFoundViaLookup = this.user.companyAddressFoundViaLookup;
        if (!this.businessAddressFoundViaLookup) {
            this.manualStyling = true;
        }

        this.lookupValueSelected = true;
        this._selectedData = UTILS.getCompanyAddress(this.user);

        if (this._selectedData && !this.selectedAddressRender) {
            this.selectedAddressRender = true;
            this.checkStepErrors();
        }

        this.querySelector('[data-field="companyName"]')?.disable(!this.user.selectedCompanyName);
    }

    async handleNext() {
        const data = this.getStepData();
        this.stepError = data.validationError;
        const isSubmitSkipped = !this.stepError && !this.user.isContactDataChanged;

        document.removeEventListener('modalclose', this._bindModalCloseEventHandler);
        this.isConnected = false;

        if (this.USER.canGoToNextAvailableStep() || isSubmitSkipped) {
            this.USER.update({
                currentSubStep: 'company_details'
            });
        } else if (!this.stepError && !this.USER.isAddressSearchActive) {
            if (!this.businessAddressFoundViaLookup && this.proofOfBusinessAddressVisible) this.parseAddressLineValue();

            const maxCreditLimit = this.user.maxCreditLimit ?? 0;

            this.USER.update({
                termsAndConditionsAgreement: true,
                maxCreditLimit: maxCreditLimit
            });
            this.USER.update(data);

            const isSourceAbsent = !this.user.source;
            const submitResult = REST.sendModel(this.user, this.user.countryCode, REST.METHODS.SUBMIT_MODEL,
                this.user.currentStep, false, this.USER.state.isUserChanged, this.user.currentSubStep, this, isSourceAbsent)
                .catch(error => {
                    if (this.settings?.ETE_settings?.DEBUG_MODE) {
                        console.log('REST.submit EXEPTION', error);
                    }
                });

            UTILS.checkDeduplication(this);

            this.USER.update({
                currentSubStep: 'company_details',
                isContactDataChanged: false
            });

            const response = await submitResult;

            if (response?.statusCode == STATUSES.SUCCESS) {
                const isSourceEmpty = !this.user.source;

                if (response.userData) {
                    delete response.userData.currentStep;
                    this.USER.update(response.userData);
                }

                if (isSourceEmpty && location.hostname !== 'localhost') {
                    const url = `/ete/${this.settings?.default_settings.vfPageName}?source=${encodeURIComponent(response.userData.source)}`;
                    window.history.pushState({id: `${this.settings?.default_settings.vfPageName}`}, document.title, url);
                }
            } else {
                if (this.settings?.ETE_settings?.DEBUG_MODE) {
                    console.log('REST.submit ERROR', response);
                }
            }
        }
    }

    handleDataChange(event) {
        const fieldName = event.currentTarget.getAttribute('data-field');

        if (AVAILABLE_FIELDS.includes(fieldName)) {
            this[fieldName] = event.currentTarget.value;
            this.USER.update({
                [fieldName]: event.currentTarget.value,
                isContactDataChanged: true
            });
        } else {
            this.locationLine = event.currentTarget.value;
            this.USER.update({
                isContactDataChanged: true
            });
            this.USER.change();
        }

        if (FETCH_CHECK_FIELDS.includes(fieldName)) {
            this.USER.setState({
                isUserChanged: true
            });

            this.USER.clearPaymentTermsData();
            this.USER.clearPricingOptionsData();
        }

        if (DEDUP_CHECK_FIELDS.includes(fieldName)) {
            this.USER.setState({
                isDeduplicationNeeded: true
            });
        }

        this.stepErrorCheck(true);
    }

    parseAddressLineValue() {
        const address = this.locationLine.split(',');
        const userFieldChanges = {};

        switch (address.length) {
            case 1: {
                const [street] = address;
                userFieldChanges.houseName = '';
                userFieldChanges.houseNumber = '';
                userFieldChanges.street = street;
                break;
            }
            case 2: {
                const [houseName, street] = address;
                userFieldChanges.houseName = houseName;
                userFieldChanges.houseNumber = '';
                userFieldChanges.street = street.trim();
                break;
            }
            case 3: {
                const [houseName, houseNumber, street] = address;
                userFieldChanges.houseName = houseName;
                userFieldChanges.houseNumber = houseNumber;
                userFieldChanges.street = street.trim();
                break;
            }
            default: {
                userFieldChanges.houseName = '';
                userFieldChanges.houseNumber = '';
                userFieldChanges.street = this.locationLine;
                break;
            }
        }

        this.USER.update(userFieldChanges);
    }

    stepErrorCheck() {
        this.stepError = this.stepError ? this.getStepData().validationError : false;
    }

    get addressLabelVisible() {
        return this.businessAddressFoundViaLookup && this._selectedData;
    }

    handleChangeBusinessType(event) {
        this.selectedAddressRender = false;
        this.proofOfBusinessAddressVisible = false;
        this.clearAddressFields();
        this.companyPostcode = "";
        this._selectedData = "";
        this.companyName = "";
        this.selectedCompany = null;
        this.companiesData = [];
        this.setCompanyNameRegex('^$');

        if (this.user.companyFoundViaLookup === false) {
            this.setCompanyNameRegex("");
        }

        this.USER.update({
            ownersData: [],
            selectedCompanyName: event.detail.value,
            companyName: this.user.companyName ? '' : null
        });

        this.changeBusinessTypePostActions();
    }

    handleCompanyNameInput(event) {
        this.proofOfBusinessAddressVisible = false;
        this.clearAddressFields();
        this.companyPostcode = "";
        this._selectedData = "";
        this.companyName = event.currentTarget.value;
        const isFoundViaLookup = this.user.companyFoundViaLookup;
        const userFieldChanges = {};

        if (!isFoundViaLookup && isFoundViaLookup !== null) {
            userFieldChanges.companyName = '';
            this.setCompanyNameRegex('^$');
        }

        if (!this.lookupVisible) {
            this.lookupVisible = true;
        }

        userFieldChanges.companyFoundViaLookup = true;
        this.USER.update(userFieldChanges);
    }

    handleCompanySelected(e) {
        this.lookupVisible = false;
        this.selectedAddressRender = false;

        const userFieldChanges = {};

        if (e.detail.companyDetails) {
            userFieldChanges.companyName = e.detail.companyDetails.companyName;
            userFieldChanges.companyFoundViaLookup = true;
            userFieldChanges.companyNumber = e.detail.companyDetails.basicData.BusinessRef;

            this.USER.update(userFieldChanges);
        }

        const selectedCompanyNumber = this.selectedCompany?.basicData.BusinessRef;
        let parsedCompanyDetails = JSON.parse(JSON.stringify(e.detail.companiesData));

        if (this.companyName !== this.previousCompanyNameValue) {
            parsedCompanyDetails = parsedCompanyDetails.filter(data => selectedCompanyNumber !== data.basicData.BusinessRef);
        }

        parsedCompanyDetails.forEach((company) => {
            company.selected = false;
            if (company.basicData.BusinessRef === this.user.companyNumber) {
                company.selected = true;
                this.selectedCompany = company;
            }
        });
        this.companiesData = parsedCompanyDetails.sort((a, b) => {
            if (a.selected) return -1;
            else if (b.selected) return 1;
            else return a.name.localeCompare(b.name) || a.address.localeCompare(b.address)
        });

        this.companyName = this.user.companyName;
        this.previousCompanyNameValue = e.detail.userInput;
        this.setCompanyNameRegex("");

        this.checkStepErrors();

        this.USER.setState({
            isUserChanged: true,
            isDeduplicationNeeded: true
        });

        this.USER.clearPaymentTermsData();
        this.USER.clearPricingOptionsData();
    }

    handleSelectedCompanyInfo(event) {
        const companyAddress = event.detail.address;
        const userFieldChanges = {};

        if (!!companyAddress) {
            companyAddress.fields.forEach((field) => {
                if (field.id && this.ADDRESS_FIELD_MAPPING[field.id]) {
                    this[this.ADDRESS_FIELD_MAPPING[field.id]] = field.content;
                }
            });

            userFieldChanges.companyPostcode = this.companyPostcode;
            userFieldChanges.houseName = this.houseName;
            userFieldChanges.houseNumber = this.houseNumber;
            userFieldChanges.street = this.street;
            userFieldChanges.city = this.city;
            userFieldChanges.state = this.state;
            userFieldChanges.isContactDataChanged = true;

            this.USER.update(userFieldChanges);
        }

        if (event.detail.error) {
            this.parseCompanyAddress(this.selectedCompany.basicData.BusinessLocation);
        }

        const currentBusinessTypeSettings = this.settings?.business_settings.business_types.find(type => this.user.selectedCompanyName === type.label);
        if (!this.user.companyPostcode && currentBusinessTypeSettings.isManualEntryPossible && !this.USER.isAddressSearchActive) {
            const modalTitle = this.content.ETE_STEP_company_details.cant_process_address_modal_title;
            const modalDescription = this.content.ETE_STEP_company_details.cant_process_address_modal_description;
            this.showInfoModal(modalTitle, modalDescription);
        }

        this.locationLine = this.setAddressLine(this.user.houseName, this.user.houseNumber, this.user.street);
    }

    parseCompanyAddress(address) {
        const userFieldChanges = {};
        const locationLine1 = address.LocationLine1;
        const locationLine2 = address.LocationLine2;
        const locationLine3 = address.LocationLine3;
        const locationLine4 = address.LocationLine4;
        const locationLine5 = address.LocationLine5;

        userFieldChanges.companyPostcode = Object.values(address)[Object.keys(address).length - 1]
            .match(settings.ETE_STEP_about_you.companyPostcode_regex) ?
            Object.values(address)[Object.keys(address).length - 1] : "";

        switch (Object.keys(address).length) {
            case 3: {
                userFieldChanges.street = locationLine1;
                userFieldChanges.city = locationLine2;
                userFieldChanges.state = '';
                break;
            }
            case 4: {
                userFieldChanges.street = locationLine1;
                userFieldChanges.city = locationLine2;
                userFieldChanges.state = locationLine3;
                break;
            }
            case 5: {
                userFieldChanges.houseName = locationLine1;
                userFieldChanges.street = locationLine2;
                userFieldChanges.city = locationLine3;
                userFieldChanges.state = locationLine4;
                break;
            }
            case 6: {
                userFieldChanges.houseName = locationLine1;
                userFieldChanges.houseNumber = locationLine2;
                userFieldChanges.street = locationLine3;
                userFieldChanges.city = locationLine4;
                userFieldChanges.state = locationLine5;
                break;
            }
        }

        userFieldChanges.isContactDataChanged = true;

        this.USER.update(userFieldChanges);
    }

    handleCompanyName() {
        if (this.companyName && this.user.companyFoundViaLookup !== false) {
            this.lookupVisible = true;

            if (this.user.companyName && this.previousCompanyNameValue) {
                this.companyName = this.previousCompanyNameValue;
            }
        }
    }

    handleCompanyNameBlur() {
        this.lookupVisible = false;
        if (this.user.companyName) {
            this.companyName = this.user.companyName;
        }
    }

    handleAddressSelected(event) {
        this.checkStepErrors();
        this.lookupValueSelected = true;
        this._selectedData = event.detail?.text;

        this.USER.setState({
            isDeduplicationNeeded: true
        });
    }

    handleAddressChange() {
        if (this._selectedData) this._selectedData = "";
    }

    handleAddressClick() {
        this.selectedAddressRender = false;
    }

    handleAddressInput(event) {
        this.clearAddressFields();
        const addressInformation = event.detail;
        if (addressInformation) {
            addressInformation.fields.forEach((field) => {
                if (field.id && this.ADDRESS_FIELD_MAPPING[field.id]) {
                    this[this.ADDRESS_FIELD_MAPPING[field.id]] = field.content;
                }
            });

            this.USER.update({
                houseName: this.houseName,
                houseNumber: this.houseNumber,
                street: this.street,
                state: this.state,
                city: this.city,
                companyPostcode: this.companyPostcode,
                companyAddressFoundViaLookup: true,
                isContactDataChanged: true
            });

            this.locationLine = this.setAddressLine(this.user.houseName, this.user.houseNumber, this.user.street);

            if (!this.user.companyPostcode && !this.USER.isAddressSearchActive) {
                const modalTitle = this.content.ETE_STEP_company_details.cant_process_address_modal_title;
                const modalDescription = this.content.ETE_STEP_company_details.cant_process_address_modal_description;
                this.showInfoModal(modalTitle, modalDescription);
            }
        }
        this.stepErrorCheck(true);
    }

    clearAddressFields() {
        this.houseName = "";
        this.houseNumber = "";
        this.street = "";
        this.city = "";
        this.state = "";
    }

    handleSwitchSearchType() {
        if (!this.businessAddressFoundViaLookup) {
            this.lookupValueSelected = true;
        }
        this.selectedAddressRender = false;
        this.lookupValueSelected = !this.lookupValueSelected;
        this.businessAddressFoundViaLookup = !this.businessAddressFoundViaLookup;
        this.querySelector('[data-name="switchButtonContainer"]').classList.toggle("step-about-you__max-flex");

        if (this.businessAddressFoundViaLookup) {
            this._selectedData = "";
        }

        this.USER.update({
            companyAddressFoundViaLookup: this.businessAddressFoundViaLookup
        });
    }

    handleCantFindMyCompany() {
        this.proofOfBusinessAddressVisible = true;
        this.businessAddressFoundViaLookup = true;
        this.lookupVisible = false;
        this.setCompanyNameRegex("");

        if (this.selectedCompany) {
            const parsedCompanyDetails = JSON.parse(JSON.stringify(this.companiesData));
            parsedCompanyDetails.forEach((company) => {
                company.selected = false;
            });
            this.companiesData = parsedCompanyDetails;
            this.selectedCompany = null;
        }

        const userFieldChanges = {companyFoundViaLookup: false};

        if (this.companyName !== this.previousCompanyNameValue) {
            userFieldChanges.companyName = this.companyName;
            userFieldChanges.companyNumber = "";
            userFieldChanges.companyPostcode = "";
        }

        this.USER.update(userFieldChanges);
    }

    handlePostcodeBlur() {
        if (this.user.companyPostcode) {
            this.USER.update({
                companyPostcode: this.user.companyPostcode.toUpperCase(),
            });
        }
    }

    changeBusinessTypePostActions() {
        const currentBusinessTypeSettings = this.settings?.business_settings.business_types.find(type => this.user.selectedCompanyName === type.label);
        this.companyNameLabel = currentBusinessTypeSettings.companyNameLabel;
        this.companyType = currentBusinessTypeSettings;
        this.companySearchByType = currentBusinessTypeSettings.searchBy;
        this.isManualEntryPossible = currentBusinessTypeSettings.isManualEntryPossible;

        this.companyNameErrorMessage = UTILS.formatString(this.content.ETE_STEP_about_you.companyName_emptyField_error_cd, currentBusinessTypeSettings.friendlyName);
        this.notSelectedCompanyNameErrorMessage = UTILS.formatString(this.content.ETE_common_components_translations.this_lookup_field_required, currentBusinessTypeSettings.friendlyName);
    }

    setCompanyNameRegex(regex) {
        this.querySelector('[data-field="companyName"]').regExp = regex;
    }

    setAddressLine(...args) {
        const addressLine = [];

        args.forEach(item => {
            if(!!item) {
                addressLine.push(item);
            }
        })

        return addressLine.join(', ');
    }

    changeAddressSearchToManual() {
        this.proofOfBusinessAddressVisible = true;
        this.businessAddressFoundViaLookup = false;
        this.manualStyling = true;

        this.USER.update({
            companyFoundViaLookup: false,
            companyAddressFoundViaLookup: false
        });
    }

    checkStepErrors() {
        this.stepError = this.stepError ? this.getStepData().validationError : false;
    }

    getStepData() {
        return UTILS.collectDataForElements(this, [
            this.CONSTANTS.ELEMENTS.INPUT,
            this.CONSTANTS.ELEMENTS.PICKLIST,
            this.CONSTANTS.ELEMENTS.ADDRESS_LOOKUP
        ]);
    }
}
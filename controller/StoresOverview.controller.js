sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, MessageToast, MessageBox) {
	"use strict";

	return Controller.extend("hanna.karabankova.controller.StoresOverview", {

		/**
         * Controller's "init" lifecycle method.
         */
		onInit: function(){
            let oMessageManager = sap.ui.getCore().getMessageManager();
			oMessageManager.registerObject(this.getView(), true);
            this.getView().setModel(oMessageManager.getMessageModel(), "messages");
			this.oResourceBundle = this.getOwnerComponent()
			.getModel("i18n")
			.getResourceBundle();
		},
		
		/**
		 * Stores list element press, event handler.
		 *
		 * @param {sap.ui.base.Event} oEvent event object
		 */
		onListItemPress: function(oEvent){
			let oCtx = oEvent.getSource().getBindingContext("odata");
			let oComponent = this.getOwnerComponent();
			oComponent.getRouter().navTo("StoreDetails", {
				shopId: oCtx.getObject("id")
			});

			this.resetStoreSearch();
		},

		/**
         * "Search" event handler of the "SearchField".
         *
         * @param {sap.ui.base.Event} oEvent event object.
         */
		onStoresSearch: function (oEvent) {
			let oStoresList = this.byId("StoresList");
			let oItemsBinding = oStoresList.getBinding("items");
			let sQuery = oEvent.getParameter("query");

			const oFilter = new Filter({
				filters: [
					new Filter("Name", FilterOperator.Contains, sQuery),
					new Filter("Address", FilterOperator.Contains, sQuery)
				],
				and: false
			});

			oItemsBinding.filter(oFilter);
		},

		/**
         * Method for resetting stores search.
         */
		resetStoreSearch: function(){
			let oStoresList = this.byId("StoresList");
			let oItemsBinding = oStoresList.getBinding("items");
			let oStoresSearchInput = this.byId("storesSearch");

			oStoresSearchInput.setValue("");
			oItemsBinding.filter();
		},

		/**
         * "Open dialog" button press event handler. Open dialog to create store.
         */
		onCreateStorePress: function(){
			let oPromiseDialog;
			let oView = this.getView();
			let oODataModel = oView.getModel("odata");
			const sMessageToastText = this.oResourceBundle.getText("AddStoreSuccessMessageToast");
			const sMessageBoxText = this.oResourceBundle.getText("AddStoreMessageBoxError");

			if (!this.oDialog) {
				oPromiseDialog = this.loadFragment({
					name: "hanna.karabankova.view.fragments.AddStoreDialog"
				}).then(function(oDialog){
					this.oDialog = oDialog;
					oView.addDependent(this.oDialog);
				}.bind(this));
			} else {
				oPromiseDialog = Promise.resolve();
			};

			let oEntryCtx = oODataModel.createEntry("/Stores", {
				success: () => {
                    MessageToast.show(sMessageToastText);
                    this.oDialog.close();
                },
                error: function () {
                    MessageBox.error(sMessageBoxText);
                }
			});

			oPromiseDialog.then(function () {
				this.oDialog.setBindingContext(oEntryCtx);
				this.oDialog.setModel(oODataModel);
				this.oDialog.open();
			}.bind(this));
		},

		/**
         * Method for validating inputs for emptiness.
         *
         * @returns {boolean} result of validation.
         */
		onValidateStoreCreateFieldGroup: function() {
			let aFieldGroup = this.getView().getControlsByFieldGroupId("createStore");
			let aInputs = aFieldGroup.filter(input => input.sParentAggregationName === "fields");
			const sValueStateText = this.oResourceBundle.getText("ValidateFieldGroupValueStateText");

			aInputs.forEach(input => {
				if(!input.getValue()){
					input.setValueState("Error");
					input.setValueStateText(sValueStateText);
				}else{
					input.setValueState("None");
				};
			});

			if(aInputs.filter(input => input.getValueState() === "Error").length !==0){
				return false;
			}else{
				return true;
			};
		},

		/**
         * "Create" button press event handler (in the dialog for creating the store).
         */
		onDialogCreatePress: function () {
			let oODataModel = this.getView().getModel("odata");
			let bPassedValidation = this.onValidateStoreCreateFieldGroup();
			const sMessageToastText = this.oResourceBundle.getText("ValidateMessageToastText");

			if(bPassedValidation){
				oODataModel.submitChanges();
			}else{
				MessageToast.show(sMessageToastText);
			};
		},

		/**
         * "Close" button press event handler (in the dialog for creating the store).
         */
		onDialogClosePress: function () {
			let oODataModel = this.getView().getModel("odata");
			let oCtx = this.oDialog.getBindingContext();
			let aFieldGroup = this.getView().getControlsByFieldGroupId("createStore");
			let aInputs = aFieldGroup.filter(input => input.sParentAggregationName === "fields");

			aInputs.forEach(input => input.setValueState("None"))

			oODataModel.deleteCreatedEntry(oCtx);
			this.oDialog.close();
		}
	});
});

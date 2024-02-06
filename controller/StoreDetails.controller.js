sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    'sap/ui/model/FilterOperator',
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
	"sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, Sorter, JSONModel, MessageToast, MessageBox) {
	"use strict";

    const SORT_NONE	= "";
	const SORT_ASC	= "ASC";
	const SORT_DESC	= "DESC";
    const aStatuses = ["ALL", "OK", "STORAGE", "OUT_OF_STOCK"];

	return Controller.extend("hanna.karabankova.controller.StoreDetails", {
        
        /**
         * Controller's "init" lifecycle method.
         */
        onInit: function(){
            this.getOwnerComponent().getRouter().getRoute("StoreDetails").attachPatternMatched(this._onPatternMatched, this);

            let oMessageManager = sap.ui.getCore().getMessageManager();
			oMessageManager.registerObject(this.getView(), true);
            this.getView().setModel(oMessageManager.getMessageModel(), "messages");
        
            const oAppViewModel = new JSONModel({
                productsCount: 0,
                sortTypes: {
                    "Name": SORT_NONE,
                    "Price": SORT_NONE,
                    "Specs": SORT_NONE,
                    "SupplierInfo": SORT_NONE,
                    "MadeIn": SORT_NONE,
                    "ProductionCompanyName": SORT_NONE,
                    "Rating": SORT_NONE
                }
            });

            this.oAppViewModel = oAppViewModel;
            this.getView().setModel(oAppViewModel, "appViewModel");
            this.oResourceBundle = this.getOwnerComponent()
			.getModel("i18n")
			.getResourceBundle();
        },

        /**
		 * Event handler to the patternMatched event of this sap.ui.core.routing.Route.
		 *
		 * @param {sap.ui.base.Event} oEvent event object
		 */
        _onPatternMatched: function(oEvent) {
            let mRouteArguments = oEvent.getParameter("arguments");
            let sStoreID = mRouteArguments.shopId;
            let oODataModel = this.getView().getModel("odata");
            
            oODataModel.metadataLoaded().then(function () {
                let sKey = oODataModel.createKey("/Stores", {id: sStoreID});
                this.getView().bindObject({
                    path: sKey,
                    model: "odata"
                });
                this.resetSort();
                this.resetProductSearch();
            }.bind(this));
        },

        /**
         * Method to display the number of products of each status.
         */
        onAfterRendering: function () {
            let oODataModel = this.getView().getModel("odata");
            let oProductsTable = this.byId("ProductsTable");
            let oBinding = oProductsTable.getBinding("items");
            let oAppView = this.getView().getModel("appView");

            oBinding.attachDataReceived(function () {
                let oCtx = oProductsTable.getBindingContext("odata");
                let sStoresPath = oODataModel.createKey("/Stores", oCtx.getObject());

                aStatuses.forEach(function (sStatus) {
                    const oParams = {
                        success: function (sCount) {
                            oAppView.setProperty(
                                "/" + sStatus.toLowerCase() + "ProductsCount",
                                sCount
                            );
                        }
                    };

                    if (sStatus !== "ALL") {
                        oParams.filters = [
                            new Filter("Status", FilterOperator.EQ, sStatus)
                        ];
                    };

                    oODataModel.read(sStoresPath + "/rel_Products/$count", oParams);
                });
            });
        },

        /**
         * Method to display products by category "Status".
         * 
         * @param {sap.ui.base.Event} oEvent event object.
         */
        onFilterSelect: function(oEvent){
            let oTableList = this.byId("ProductsTable");
            let oItemsBinding = oTableList.getBinding("items");
            let sStatusKey = oEvent.getParameter("key");

            const quickFilter = function(status){
                let oFilter = new Filter("Status",  FilterOperator.EQ, status);
                oItemsBinding.filter(oFilter);
            };

            if(sStatusKey==="Ok"){
                quickFilter("OK")
            }else if(sStatusKey==="Storage"){
                quickFilter("STORAGE")
            }else if(sStatusKey==="Out_of_stock"){
                quickFilter("OUT_OF_STOCK")
            }else if(sStatusKey==="All"){
                oItemsBinding.filter()
            }
        },

        /**
         * "Search" event handler of the "SearchField".
         *
         * @param {sap.ui.base.Event} oEvent event object.
         */
        onProductsSearch: function (oEvent) {
			let oProductsTable = this.byId("ProductsTable");
			let oItemsBinding = oProductsTable.getBinding("items");
			let sQuery = oEvent.getParameter("query");

			const oFilter = new Filter({
				filters: [
					new Filter("Name", FilterOperator.Contains,sQuery),
					new Filter("Specs", FilterOperator.Contains, sQuery),
                    new Filter("SupplierInfo", FilterOperator.Contains,sQuery),
                    new Filter("MadeIn", FilterOperator.Contains, sQuery),
                    new Filter("ProductionCompanyName", FilterOperator.Contains, sQuery)
				],
				and: false
			});

			oItemsBinding.filter(oFilter);
		},

        /**
         * Method for resetting product search.
         */
        resetProductSearch: function(){
            let oProductsTable = this.byId("ProductsTable");
			let oItemsBinding = oProductsTable.getBinding("items");
            let oProductSearchInput = this.byId("productSearch");

            oProductSearchInput.setValue("");
            oItemsBinding.filter();
        },

        /**
         * "Sort" button press event handler.
         * 
         * @param {sap.ui.base.Event} oEvent event object.
         */
        onSortButtonPress: function (oEvent) {
            let aSortTypes = this.oAppViewModel.getProperty("/sortTypes");
            let sSortFiled = oEvent.getSource().getProperty("text");
            let sSortType = this.oAppViewModel.getProperty(`/sortTypes/${sSortFiled}`);

            for (let key in aSortTypes) {
                aSortTypes[key] = SORT_NONE;
            };

            switch (sSortType) {
                case SORT_NONE: {
                    sSortType = SORT_ASC;
                    break;
                }

                case SORT_ASC: {
                    sSortType = SORT_DESC;
                    break;
                }

                case SORT_DESC: {
                    sSortType = SORT_ASC;
                    break;
                }
            }

            this.oAppViewModel.setProperty(`/sortTypes/${sSortFiled}`, sSortType);
            let oProductsTable = this.byId("ProductsTable");
            let oItemsBinding = oProductsTable.getBinding("items");

            if(sSortType){
                let bSortDesc = sSortType === SORT_DESC;
                let oSorter = new Sorter(sSortFiled, bSortDesc);
                oItemsBinding.sort(oSorter);
            }else{
                oItemsBinding.sort();
            }
        },
        
        /**
         * Formatter for the icon used in a sort trigger button.
         *
         * @param {string} sSortType sorting type.
         *
         * @returns {string} icon name.
         */
        sortTypeFormatter: function (sSortType) {
            switch (sSortType) {
                case SORT_NONE: {
                    return "sort";
                }
                case SORT_ASC: {
                    return "sort-ascending";
                }
                case SORT_DESC: {
                    return "sort-descending";
                }
                default: {
                    return "sort";
                }
            }
        },

        /**
         * Method for resetting sorting.
         */
        resetSort: function(){
            let oProductsTable = this.byId("ProductsTable");
            let oItemsBinding = oProductsTable.getBinding("items");

            oItemsBinding.sort();
            this.getView().getModel("appViewModel").setProperty("/sortTypes", 
            {
                "Name": SORT_NONE,
                "Price": SORT_NONE,
                "Specs": SORT_NONE,
                "SupplierInfo": SORT_NONE,
                "MadeIn": SORT_NONE,
                "ProductionCompanyName": SORT_NONE,
                "Rating": SORT_NONE
            });
        },

        /**
         * "Delete" store button press event handler.
         *
         * @param {sap.ui.base.Event} oEvent event object
         */
        onDeleteStorePress: function (oEvent) {
            let oCtx = oEvent.getSource().getBindingContext("odata");
            let oODataModel = oCtx.getModel();
            let sKey = oODataModel.createKey("/Stores", oCtx.getObject());
            const sMessageBoxConfirmText = this.oResourceBundle.getText("DeleteStoreMessageBoxConfirmText");
            const sMessageToastSuccessText = this.oResourceBundle.getText("DeleteStoreMessageToastSuccessText");
            const sMessageBoxErrorText = this.oResourceBundle.getText("DeleteStoreMessageBoxErrorText");

            MessageBox.confirm(sMessageBoxConfirmText , {
                actions: [ sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL ],         
                emphasizedAction: sap.m.MessageBox.Action.OK, 
                onClose: (sAction) => {
                    if(sAction==="OK"){
                        oODataModel.remove(sKey, {
                            success: () => {
                                this.getOwnerComponent().getRouter().navTo("StoresOverview");
                                MessageToast.show(sMessageToastSuccessText);
                            },
                            error: function () {
                                MessageBox.error(sMessageBoxErrorText);
                            }
                        });
                    };
                }   
            });
        },

        /**
         * "Open dialog" button press event handler. Open dialog to edit product.
         * 
         * @param {sap.ui.base.Event} oEvent event object.
         */
        onEditProductPress: function(oEvent){
            let oPromiseDialog;
            let oView = this.getView();
            let oCtx = oEvent.getSource().getBindingContext("odata");
            let oODataModel = oCtx.getModel();

            if (!this.oEditDialog) {
				oPromiseDialog = this.loadFragment({
					name: "hanna.karabankova.view.fragments.EditProductDialog"
				}).then(function(oDialog){
					this.oEditDialog = oDialog; 
                    oView.addDependent(this.oEditDialog);
				}.bind(this));
			} else {
				oPromiseDialog = Promise.resolve();
			};

            oPromiseDialog.then(function () {
                this.oEditDialog.setBindingContext(oCtx);
                this.oEditDialog.setModel(oODataModel);
				this.oEditDialog.open();
			}.bind(this));
        },

        /**
         * "Edit" button press event handler (in the dialog for editing the product).
         */
        onDialogEditPress:function(){
            let oODataModel = this.getView().getModel("odata");
            let bPassedValidation = this.onValidateProductCreateFieldGroup("editProduct");
            let bPandingChanges= oODataModel.hasPendingChanges();
            const sMessageToastText = this.oResourceBundle.getText("EditProductMessageToastText");
            const sMessageBoxPandingErrorText = this.oResourceBundle.getText("EditProductMessageBoxPandingErrorText");
            const sMessageBoxValidationErrorText = this.oResourceBundle.getText("EditProductMessageBoxValidationErrorText");

			if(bPassedValidation && bPandingChanges){
				oODataModel.submitChanges();
                this.oEditDialog.close();
                MessageToast.show(sMessageToastText);
			} else if (bPassedValidation && !bPandingChanges){
				MessageBox.error(sMessageBoxPandingErrorText);
			} else if (!bPassedValidation) {
                MessageBox.error(sMessageBoxValidationErrorText);
            }
        },

        /**
         * "Close" button press event handler (in the dialog for editing the product).
         */
        onEditProductDialogClosePress: function () {
			let oODataModel = this.getView().getModel("odata");
            let aFieldGroup = this.getView().getControlsByFieldGroupId("editProduct");
			let aInputs = aFieldGroup.filter(input => input.sParentAggregationName === "fields");

			aInputs.forEach(input => input.setValueState("None"));
            oODataModel.resetChanges();
			this.oEditDialog.close();
		},

        /**
         * "Open dialog" button press event handler. Open dialog to create product.
         */
        onCreateProductPress: function(oEvent) {
			let oPromiseDialog;
            let oView = this.getView();
			let oODataModel = oView.getModel("odata");
            let oCtx = oEvent.getSource().getBindingContext("odata");
            let sStoreId = oCtx.getObject().id;
            const sMessageToastText = this.oResourceBundle.getText("AddProductSuccessMessageToast");
			const sMessageBoxText = this.oResourceBundle.getText("AddProductMessageBoxError");

			if (!this.oDialog) {
				oPromiseDialog = this.loadFragment({
					name: "hanna.karabankova.view.fragments.AddProductDialog"
				}).then(function(oDialog){
					this.oDialog = oDialog;
                    oView.addDependent(this.oDialog);
				}.bind(this));
			} else {
				oPromiseDialog = Promise.resolve();
			};

            let oEntryCtx = oODataModel.createEntry("/Products", {
				properties: {
                    Photo: "Photo of the product",
                    StoreId: sStoreId
				},
                success: () => {
                    MessageToast.show(sMessageToastText);
                    this.oDialog.close();
                },
                error: () => {
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
        onValidateProductCreateFieldGroup: function(fieldGroupId) {
			let aFieldGroup = this.getView().getControlsByFieldGroupId(fieldGroupId);
			let aInputs = aFieldGroup.filter(input => input.sParentAggregationName === "fields");
            aInputs.pop();
            const sValueStateText = this.oResourceBundle.getText("ValidateFieldGroupValueStateText");
            let aAllFields = aFieldGroup.filter(input => input.sParentAggregationName === "fields");
            let oSelect = aAllFields[7];
            let sSelectedKey = oSelect.getSelectedKey();
            
            aInputs.forEach(input => {
				if(!input.getValue()){
					input.setValueState("Error");
					input.setValueStateText(sValueStateText);
				}else{
					input.setValueState("None");
				};
			});

            if(!sSelectedKey){
                oSelect.setValueState("Error");
                oSelect.setValueStateText(sValueStateText);
            }else{
                oSelect.setValueState("None");
            };

			if(aInputs.filter(input => input.getValueState() === "Error").length !==0 || oSelect.getValueState() === "Error"){
				return false;
			}else{
				return true;
			};
		},

        /**
         * "Create" button press event handler (in the dialog for creating the product).
         */
        onDialogCreatePress: function () {
			let oODataModel = this.getView().getModel("odata");
            let bPassedValidation = this.onValidateProductCreateFieldGroup("createProduct");
            const sMessageToastText = this.oResourceBundle.getText("ValidateMessageToastText");

			if(bPassedValidation){
				oODataModel.submitChanges();
			}else{
				MessageToast.show(sMessageToastText);
			};
		},

        /**
         * "Close" button press event handler (in the dialog for creating the product).
         */
		onDialogClosePress: function () {
			let oODataModel = this.getView().getModel("odata");
			let oCtx = this.oDialog.getBindingContext();
            let aFieldGroup = this.getView().getControlsByFieldGroupId("createProduct");
			let aInputs = aFieldGroup.filter(input => input.sParentAggregationName === "fields");

			aInputs.forEach(input => input.setValueState("None"))
            oODataModel.deleteCreatedEntry(oCtx);
			this.oDialog.close();
		},

        /**
         * "Delete" product button press event handler.
         *
         * @param {sap.ui.base.Event} oEvent event object
         */
        onDeleteProductPress: function (oEvent) {
            let oCtx = oEvent.getSource().getBindingContext("odata");
            let oODataModel = oCtx.getModel();
            let sKey = oODataModel.createKey("/Products", oCtx.getObject());
            const sMessageBoxConfirmText = this.oResourceBundle.getText("DeleteProductMessageBoxConfirmText");
            const sMessageToastSuccessText = this.oResourceBundle.getText("DeleteProductMessageToastSuccessText");
            const sMessageBoxErrorText = this.oResourceBundle.getText("DeleteProductMessageBoxErrorText");

            MessageBox.confirm(sMessageBoxConfirmText, {
                actions: [ sap.m.MessageBox.Action.OK,
                            sap.m.MessageBox.Action.CANCEL ],         
                emphasizedAction: sap.m.MessageBox.Action.OK, 
                onClose: (sAction) => {
                    if(sAction==="OK"){
                        oODataModel.remove(sKey, {
                            success: () => {
                                MessageToast.show(sMessageToastSuccessText);
                            },
                            error: function () {
                                MessageBox.error(sMessageBoxErrorText);
                            }
                        });
                    };
                }   
            });
        },

        /**
         * Navigation to Stores list.
         */
        onNavToStoresList: function () {
			this.getOwnerComponent().getRouter().navTo("StoresOverview");
		},

        /**
         * Product table item press, event handler.
         *
         * @param {sap.ui.base.Event} oEvent event object
         */
        onTableListItemSelect: function (oEvent) {
			let oCtx = oEvent.getSource().getBindingContext("odata");;
			let oComponent = this.getOwnerComponent();
            
			oComponent.getRouter().navTo("ProductDetails", {
				shopId: oCtx.getObject("StoreId"),
                productId: oCtx.getObject("id")
			});
		}
	});
});

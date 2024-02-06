sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, JSONModel, MessageToast, MessageBox) {
	"use strict";

	return Controller.extend("hanna.karabankova.controller.ProductDetails", {

		/**
         * Controller's "init" lifecycle method.
         */
		onInit: function(){
			let oFeedListModel = new JSONModel();

            this.getOwnerComponent().getRouter().getRoute("ProductDetails").attachPatternMatched(this._onPatternMatched, this);
			this.getView().setModel(oFeedListModel, "oFeedListModel");
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
			let sProductID = mRouteArguments.productId;
			let sShopId = mRouteArguments.shopId;
			this.shopId = sShopId;
			this.productId = sProductID;
			this._setProductComments(sProductID);
        },

        /**
         * Method for displaying comments of the selected product.
         *
         * @param {number} sProductID "id" of the selected product.
         */
		_setProductComments: function(sProductID){
			let oODataModel = this.getView().getModel("odata");
			let oModel = this.getView().getModel("oFeedListModel");
			let oCommentsList = this.byId('idCommentsList');
			let oFilter = new Filter({
				filters: [new Filter('ProductId', FilterOperator.EQ, sProductID)],
			});
			const sMessageBoxError = this.oResourceBundle.getText("ProductDetailsSetCommentsMessageBoxError");

			oODataModel.read("/ProductComments", {
				filters: [oFilter],
				success: function (mData, mResponse) {
					oModel.setProperty("/ProductComments", mData.results);
					oCommentsList.setModel(oModel, "appView");
				},
				error: function(){
					MessageBox.error(sMessageBoxError);
				}
			});

			oODataModel.metadataLoaded().then(function () {
                let sKey = oODataModel.createKey("/Products", {id: sProductID});
                this.getView().bindObject({
                    path: sKey,
                    model: "odata"
                });
            }.bind(this));
		},

		/**
         * Post event handler (creating new comment).
		 * 
		 * @param {sap.ui.base.Event} oEvent event object.
         */
		onCreateCommentPress: function(oEvent){
			let oODataModel = this.getView().getModel("odata");
			let oCtx = oEvent.getSource().getBindingContext("odata");
            let sProductId = oCtx.getObject().id;
			let currentDate = new Date();
			let authorNameInput = this.byId("AuthorNameInput");
			let rating = this.byId("CommentRating");
			const sSuccessMessageToast = this.oResourceBundle.getText("ProductDetailsMessageToast");
			const sErrorMessageBox = this.oResourceBundle.getText("ProductDetailsMessageBoxError");

			const getInputvalue = (input) => {
				return this.byId(input).getValue();
			}

			const oNewComment = {
                "Author": getInputvalue("AuthorNameInput"),
                "Message": getInputvalue("FeedInput"),
                "Rating": getInputvalue("CommentRating"),
                "Posted": currentDate,
                "ProductId": sProductId,
			};

			oODataModel.create("/ProductComments", oNewComment, {
				success: () => {
					MessageToast.show(sSuccessMessageToast);
					this._setProductComments(sProductId);
					authorNameInput.setValue("");
					rating.setValue(0);
				},
				error: function () {
					MessageBox.error(sErrorMessageBox);
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
         * Navigation to Store Details.
         */
		onNavToStoreDetails:function() {
			this.getOwnerComponent().getRouter().navTo("StoreDetails", {shopId:this.shopId});
		}
	});
});

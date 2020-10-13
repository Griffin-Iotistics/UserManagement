sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/Device',
	'sap/ui/model/Sorter',
	'sap/m/MessageToast'
], function (Controller, Filter, FilterOperator, Device, Sorter, MessageToast) {
	"use strict";

	return Controller.extend("com.usr.managementv2.controller.Master", {

		onInit: function () {

			var oRouter = this.getOwnerComponent().getRouter();
			var oTarget = oRouter.getTarget("MasterPage");
			oTarget.attachDisplay(this._onDetailMatch, this);
			this._mViewSettingsDialogs = {};

			this.totalUserCount = 0;
			this.startIndex = 0;
			this.skip = 20;

			// var details = new sap.ui.model.json.JSONModel();
			// details.attachRequestCompleted(this.getCurrentUserDetails.bind(this));

			var userSet = new sap.ui.model.json.JSONModel({
				UsersSet: [],
				Count: 0
			});
			this.getView().setModel(userSet);

			var createModel = new sap.ui.model.json.JSONModel(this._getCreateModel());
			this.getView().setModel(createModel, "createModel");

			// var details = new sap.ui.model.json.JSONModel();
			// details.loadData("/services/userapi/attributes?multiValuesAsArrays=true");
			// details.attachRequestCompleted(this.getCurrentUserDetails.bind(this));

		},

		_getCreateModel: function () {
			return {

				"displayName": "",
				"active": "Active",
				"userName": "",
				"emails": [{
					"value": "",
					"primary": true
				}],
				"name": {
					"givenName": "",
					"familyName": ""
				},
				"userType": "customer",
				"mailVerified": "true",
				"groups": []
			};
		},
		_onDetailMatch: function () {

			// VIVOIDP

			// /VIVOIDP/scim/Users?filter=emails eq "EmailExample"
			// var url = "/VIVOIDP/scim/Users";
			// $.ajax({
			// 	url: url,
			// 	success: this.onUserReadSuccess.bind(this),
			// 	error: this.onUserReadFail.bind(this)
			// });
			this._getTotalUserCount();
		},
		_getTotalUserCount: function () {

			var url = "/IDP-Auth/service/scim/Users?count=0";
			$.ajax({
				url: url,
				success: this.onUserCountSuccess.bind(this),
				error: this.onUserCountFail.bind(this)
			});

		},
		onUserCountSuccess: function (data) {
			this.startIndex = data.totalResults;
			var userSet = this.getView().getModel();
			userSet.setSizeLimit(data.totalResults);

			this.startIndex = this.startIndex - this.skip;
			this._getUsers(this.startIndex, this.skip);
			// var url = "/VIVOIDP/scim/Users?strtIndex=" + this.startIndex + "&count=" + this.skip;
			// $.ajax({
			// 	url: url,
			// 	success: this.onUserReadSuccess.bind(this),
			// 	error: this.onUserReadFail.bind(this)
			// });
		},
		_getUsers: function (startIndex, count) {
			var url = "/IDP-Auth/service/scim/Users?startIndex=" + startIndex + "&count=" + count;
			$.ajax({
				url: url,
				success: this.onUserReadSuccess.bind(this),
				error: this.onUserReadFail.bind(this)
			});
		},
		onUserCountFail: function (error) {
			//log fail
		},
		onUserReadSuccess: function (data) {
			// UsersSet
			var userSet = this.getView().getModel();
			userSet.setProperty("/UsersSet", data.Resources);
			userSet.setProperty("/Count", data.totalResults);
		},
		onUserReadFail: function (error) {
			//log fail
		},
		getCurrentUserDetails: function (oEvent) {},

		createViewSettingsDialog: function (sDialogFragmentName) {
			var oDialog = this._mViewSettingsDialogs[sDialogFragmentName];

			if (!oDialog) {
				oDialog = sap.ui.xmlfragment(sDialogFragmentName, this);
				this._mViewSettingsDialogs[sDialogFragmentName] = oDialog;
				this.getView().addDependent(oDialog);
				if (Device.system.desktop) {
					oDialog.addStyleClass("sapUiSizeCompact");
				}
			}
			return oDialog;
		},
		handleSortButtonPressed: function () {
			this.createViewSettingsDialog("com.usr.managementv2.fragments.UserSorting").open();
		},

		handleSortDialogConfirm: function (oEvent) {
			var oTable = this.byId("idUserTable");
			var mParams = oEvent.getParameters();
			var oBinding = oTable.getBinding("items");
			var aSorters = [];

			var sPath = mParams.sortItem.getKey();
			var bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));
			oBinding.sort(aSorters);
		},
		handleGroupDialogConfirm: function (oEvent) {
			var oTable = this.byId("idUserTable");
			var mParams = oEvent.getParameters();
			var oBinding = oTable.getBinding("items");
			var aGroups = [];

			if (mParams.groupItem) {
				var sPath = mParams.groupItem.getKey();
				var bDescending = mParams.groupDescending;
				var vGroup = this.mGroupFunctions[sPath];
				aGroups.push(new Sorter(sPath, bDescending, vGroup));
				// apply the selected group settings
				oBinding.sort(aGroups);
			}
		},
		onSearch: function (oEvt) {
			// add filter for search
			var aFilters = [];
			var sQuery = oEvt.getSource().getValue();
			if (sQuery && sQuery.length > 0) {
				var segmentBtn = this.byId("segmentedBtnId");
				// segmentBtn
				var filter = new Filter(segmentBtn.getSelectedKey(), sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
				if (segmentBtn.getSelectedKey() == "groups/") {
					return;
				}
			}

			// update list binding
			var oTable = this.byId("idUserTable");
			var binding = oTable.getBinding("items");
			binding.filter(aFilters, "Application");

		},
		_onSearchByFilters: function (oEvent) {

			// VIVOIDP
			var segmentBtn = this.byId("segmentedBtnId");
			var key = segmentBtn.getSelectedKey();
			if (!oEvent.getSource().getValue()) {
				this._getUsers(this.startIndex, this.skip);
				return;
			}
			var param1 = "";
			var param2 = "\'" + oEvent.getSource().getValue() + "\'";
			switch (key) {
			case "emails/0/value":
				param1 = "emails";
				break;
			case "name/familyName":
				param1 = "name.familyName";
				break;
			case "id":
				param1 = "id";
				break;
			case "groups/":
				param1 = "groups";
				break;
			default:
			}
			
			// /VIVOIDP/scim/Users?filter=emails eq "EmailExample"
			var url = "/IDP-Auth/service/scim/Users?filter=" + param1 + " eq " + param2;
			$.ajax({
				url: url,
				success: this.onFilterSearchSuccess.bind(this),
				error: this.onFilterSearchFail.bind(this)
			});
		},
		onFilterSearchSuccess: function (data) {
			var userSet = this.getView().getModel();
			userSet.setProperty("/UsersSet", data.Resources);
			userSet.setProperty("/Count", data.totalResults);
			var oSearch = this.getView().byId("searchId");
			oSearch.fireLiveChange();
		},
		onFilterSearchFail: function (error) {},

		_showAddUserPopover: function () {

			if (this.addUserPopover) {
				this.addUserPopover.destroy();
			}
			this.addUserPopover = sap.ui.xmlfragment("com.usr.managementv2.fragments.AddUserPopover", this);
			this.getView().addDependent(this.addUserPopover);

		},

		_onAddUserBtnPress: function (oEvent) {

			var oSource = oEvent.getSource();
			this._showAddUserPopover();
			if (this.addUserPopover) {
				this.addUserPopover.setPlacement("Auto");
				this.getView().getModel("createModel").setProperty("/", this._getCreateModel());
				this.addUserPopover.openBy(oSource);

			}
		},
		_onFamilyNameChangeValidate: function (oEvent) {
			var oSource = oEvent.getSource();
			this._onNameChangeValidate(oSource);
		},
		_onFirstNameChangeValidate: function (oEvent) {
			var oSource = oEvent.getSource();
			this._onNameChangeValidate(oSource);
		},
		_onNameChangeValidate: function (oSource) {

			if (oSource.getValue()) {
				oSource.setValueState("None");
			} else {
				oSource.setValueState("Error");
			}
		},
		_onEmailChangeValidate: function (oEvent) {
			var oSource = oEvent.getSource();
			var email = oSource.getValue();

			var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;

			if (!mailregex.test(email)) {
				oSource.setValueState(sap.ui.core.ValueState.Error);
			} else {
				oSource.setValueState(sap.ui.core.ValueState.None);
			}
		},
		_validateAddUserDetails: function (createModel) {

			
			//check for blank
			var data = createModel.getData();
			if (!data.name.givenName) {

				this._showMessageToastByKey("blankFileds");
				return false;
			}

			if (!data.name.familyName) {

				this._showMessageToastByKey("blankFileds");
				return false;
			}

			if (!data.emails[0].value) {

				this._showMessageToastByKey("blankFileds");
				return false;
			}
			//check for valueStateError

			var form = this.addUserPopover.getContent()[0];
			var formContainer = form.getFormContainers()[0];
			var formElemtns = formContainer.getFormElements();
			for (var i = 0; i < formElemtns.length; i++) {

				var oInput = formElemtns[i].getFields()[0];
				if (oInput instanceof sap.m.Input) {
					// this._onNameChangeValidate(oInput);
					if (oInput.getValueState() === sap.ui.core.ValueState.Error) {
						this._showMessageToastByKey("errorFileds");
						return;
					}
				}

			}
			return true;
		},
		_onUserSavePress: function () {

			// data
			
			var createModel = this.getView().getModel("createModel");
			var flag = this._validateAddUserDetails(createModel);
			if (flag) {
				var data = createModel.getData();
				data.active = (data.active === "Active") ? true : false;
				data.mailVerified = "true";
				data.userName = data.name.givenName;
				$.ajax({
					url: '/IDP-Auth/service/scim/Users',
					type: 'POST',
					data: JSON.stringify(data),
					success: this.createUserSuccess.bind(this),
					error: this.createUserFail.bind(this),
					beforeSend: function (xhr, settings) {
						xhr.setRequestHeader('Content-Type', 'application/scim+Json');
					}
				});
			}

		},
		createUserSuccess: function (data) {
			
			var oModel = this.getView().getModel("i18n");
			var userCreateSuccessMsg = oModel.getResourceBundle().getText("userCreateSuccess");
			MessageToast.show(userCreateSuccessMsg);
			this.addUserPopover.close();
			this._getTotalUserCount();
			this.fnCreateUserMaster(data); // To update User to PostgreSQL database added on 18th March, 2020
		},
		_showMessageToastByKey: function (key) {
			var oModel = this.getView().getModel("i18n");
			var userCreateSuccessMsg = oModel.getResourceBundle().getText(key);
			MessageToast.show(userCreateSuccessMsg);
		},
		createUserFail: function (error) {
			// ------------------------------------------------------------- //
			// Commented by Farooq on 22nd Jan 2020
			// ------------------------------------------------------------- //
			// var oModel = this.getView().getModel("i18n");
			// var userCreateFailMsg = oModel.getResourceBundle().getText("userCreateSuccess");
			// MessageToast.show(userCreateFailMsg);
			// ------------------------------------------------------------- //
			// Modified on 22nd Jan 2020
			// ------------------------------------------------------------- //
			MessageToast.show(error.responseText);
		},
		_onUserCancel: function (oEvent) {
			this.addUserPopover.close();
		},
		onUserSelection: function (oEvent) {
			var listItem = oEvent.getParameter("listItem");

			this.getOwnerComponent().getRouter().getTargets().display("UserDetail", {
				context: listItem.getBindingContext().getObject()
			});

		},
		_onTableUpdateStarted: function (oEvent) {
			var params = oEvent.getParameters();
			if (params.reason === "Growing") {

				this.startIndex = this.startIndex - this.skip;
				// this.skip = this.skip + this.skip;
				this._getUsersOnScroll(this.startIndex, this.skip);
			}

		},
		_getUsersOnScroll: function (startIndex, count) {
			var url = "/IDP-Auth/scim/Users?startIndex=" + startIndex + "&count=" + count;
			$.ajax({
				url: url,
				success: this.onUserScrollReadSuccess.bind(this),
				error: this.onUserScrollReadFail.bind(this)
			});
		},
		onUserScrollReadSuccess: function (data) {
			// UsersSet
			var userSet = this.getView().getModel();
			var aUsersSet = userSet.getProperty("/UsersSet");
			aUsersSet = aUsersSet.concat(data.Resources);
			userSet.setProperty("/UsersSet", aUsersSet);
		},
		onUserScrollReadFail: function (error) {
			//log fail
		},
		onLoginNameFormatter: function (firstName, familyName) {
			firstName = firstName.trim().replace(/ /g, "");
			familyName = familyName.trim().replace(/ /g, "");
			return firstName + "." + familyName;
			// 
		},
		//use json
		loadSitesData: function () {
			var siteData = [{
				text: "Botswana",
				key: "BW",
				currency: "BWP"
			}, {
				text: "Burkina_Faso",
				key: "BF",
				currency: "XOF"
			}, {
				text: "Cape_Verde",
				key: "CV",
				currency: "CVE"
			}, {
				text: "Ghana",
				key: "GH",
				currency: "GHS"
			}, {
				text: "Guinea",
				key: "GN",
				currency: "GNF"
			}, {
				text: "Ivory_Coast",
				key: "CI",
				currency: "XOF"
			}, {
				text: "Kenya",
				key: "KE",
				currency: "KES"
			}, {
				text: "Madagascar",
				key: "MG",
				currency: "MGA"
			}, {
				text: "Mali",
				key: "ML",
				currency: "XOF"
			}, {
				text: "Mauritius",
				key: "MU",
				currency: "MUR"
			}, {
				text: "Morocco",
				key: "MA",
				currency: "MAD"
			}, {
				text: "Namibia",
				key: "NA",
				currency: "NAD"
			}, {
				text: "Senegal",
				key: "SN",
				currency: "XOF"
			}, {
				text: "Tunisia",
				key: "TN",
				currency: "TND"
			}, {
				text: "Uganda",
				key: "UG",
				currency: "UGX"
			}];
			return siteData;
		},
		fnInputValidation: function (oEvent) {
			var regex = /[<,>:]/;
			if (oEvent.getParameter("newValue").match(regex)) {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
				sap.ui.getCore().byId("saveUserBtn").setEnabled(false);
				oEvent.getSource().setValueStateText("Invalid Data");
			} else {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
				if (oEvent.getParameter("newValue") == "") {
					sap.ui.getCore().byId("saveUserBtn").setEnabled(false);
				} else {
					sap.ui.getCore().byId("saveUserBtn").setEnabled(true);
				}
			}
		},
		// ====================================================================== //
		// Update PostgreSQL database added on 18th March, 2020
		// ====================================================================== //
		fnCreateUserMaster: function (UserData) {
			var that = this;
			var data = {
				"idpId": UserData.id,
				"siteRetailerEmail": UserData.emails[0].value,
				"siteRetailerFirstName": UserData.name.givenName,
				"siteRetailerLastName": UserData.name.familyName,
				"siteRetailerMobile": "",
				"siteRetailerCombo": UserData.name.givenName + "." + UserData.name.familyName
			};

			var sURL = "/UserMicroService/create";
			jQuery.ajax({
				type: "POST",
				url: sURL,
				data: (JSON.stringify(data)).replace(/""/g, null),
				contentType: "application/json",
				error: function (jqXHR, textStatus, errorThrown) {
					var sMessage = jqXHR.status + " " + jqXHR.statusText + " " + jqXHR.responseText;
					jQuery.sap.log.error("Data loading", sMessage, "index.html");
				},
				success: function (oData, textStatus, jqXHR) {
					sap.m.MessageToast.show("PostgreSQL Database is updated successfully");
				}
			});
		}
	});

});
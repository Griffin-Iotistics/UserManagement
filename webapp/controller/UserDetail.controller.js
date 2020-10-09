 sap.ui.define([
 	"sap/ui/core/mvc/Controller",
 	"sap/ui/table/library",
 	"sap/ui/core/format/DateFormat",
 	"sap/m/MessageToast",
 	'sap/m/MessageBox',
 ], function (Controller, library, DateFormat, MessageToast, MessageBox) {
 	"use strict";

 	return Controller.extend("com.usr.managementv2.UserDetail", {
 		oTransactionFrag: null,
 		isVivoHeadOffice: false,
 		isMultipleGroup: false,
 		aMultipleGroup: [],
 		onInit: function () {
 			// var oDetailUi = this.getOwnerComponent().getModel("DetailUI");
 			// oDetailUi.setProperty("/editMode", false);
 			var that = this;
 			this.resetPasswordPopover = sap.ui.xmlfragment("com.usr.managementv2.fragments.ResetPassword", this);
 			this.getView().addDependent(this.resetPasswordPopover);

 			// this.initialPasswordPopover = sap.ui.xmlfragment("com.usr.managementv2.fragments.InitialPassword", this);
 			// this.getView().addDependent(this.initialPasswordPopover);

 			this.groupPopover = sap.ui.xmlfragment("com.usr.managementv2.fragments.UserGroupsAssign", this);
 			this.getView().addDependent(this.groupPopover);

 			this.getView().addDependent(this.initialPassword);

 			this.userModel = new sap.ui.model.json.JSONModel({
 				userDetails: {},
 				resetPassword: this._resetPasswordModel(),
 				groupsAll: []
 			});
 			this.getView().setModel(this.userModel);

 			this.userGroupsAll = new sap.ui.model.json.JSONModel({
 				groupsAll: []
 			});
 			this.getView().setModel(this.userGroupsAll, "userGroupsAll");

 			this.uiModel = new sap.ui.model.json.JSONModel({
 				editVisible: true,
 				listDeleteMode: "None",
 				filterGroups: {},
 			});

 			this.getView().setModel(this.uiModel, "ui");

 			var details = new sap.ui.model.json.JSONModel();
 			details.loadData("/services/userapi/attributes?multiValuesAsArrays=true");
 			details.attachRequestCompleted(this.getCurrentUserDetails.bind(this));

 			// ----------------------------------------------------------- //
 			// Added by Farooq on 31st Jan 2020
 			// ----------------------------------------------------------- //
 			var userDetails = new sap.ui.model.json.JSONModel();
 			userDetails.loadData("/USERAPI/attributes?multiValuesAsArrays=true");
 			userDetails.attachRequestCompleted(function onCompleted(oEvent) {
 				try {
 					that.aUserDetails = oEvent.oSource.getData();
 					that.aUsrGrpArray = oEvent.oSource.getData().Groups;
 					var vLen = that.aUsrGrpArray.length;
 					// If single record then make it as an array
 					if (!Array.isArray(that.aUsrGrpArray)) {
 						that.aUsrGrpArray = [that.aUsrGrpArray];
 						vLen = that.aUsrGrpArray.length;
 					}
 					// that.getCurrentUserDetails(oEvent);
 				} catch (e) {
 					//Catch Exceptions if any
 				}
 			});

 			// // this.getView().addDependent(this.oTransactionFrag);
 			var oRouter = this.getOwnerComponent().getRouter();
 			var oTarget = oRouter.getTarget("UserDetail");
 			oTarget.attachDisplay(this._onDetailMatch, this);
 		},

 		getCurrentUserDetails: function (data) {
 			this.isVivoHeadOffice = false;
 			this.isMultipleGroup = false;
 			this.aMultipleGroup = [];

 			// if (aGrpArray[i].includes("_SITE")||aGrpArray[i].includes("_SHOP")) {
 			var filterGroups = data.getSource().getData();
 			if (jQuery.isEmptyObject(filterGroups)) {
 				filterGroups = filterGroups.Groups;
 				if (filterGroups) {
 					for (var i = 0; i < filterGroups.length; i++) {
 						if (filterGroups[i] === "VivoHeadOffice") {
 							this.isVivoHeadOffice = true;
 							// break;
 						}
 						if (filterGroups[i].includes("_OS")) {
 							this.isMultipleGroup = true;
 							var prefix = filterGroups[3].split('_')[0];
 							this.aMultipleGroup.push(prefix + "_");
 						}
 					}
 					this.userModel.setProperty("/filterGroups", filterGroups);
 				} else {
 					this.userModel.setProperty("/filterGroups", []);
 				}
 			} else {
 				this.userModel.setProperty("/filterGroups", []);
 			}
 		},

 		_getGroups: function () {
 			$.ajax({
 				url: "/VIVOIDP/service/groups/?BasicAuthn=disabled",
 				type: 'GET',
 				success: this._onGroupsReadSuccess.bind(this),
 				error: this._onGroupsReadFail.bind(this),
 				beforeSend: function (xhr, settings) {
 					xhr.setRequestHeader('Content-Type', 'application/scim+Json');
 				}
 			});
 		},
 		_onGroupsReadSuccess: function (data) {
 			// var sData = data.Resources;
 			// for (var i = 0; i < sData.length; i++) {
 			// 	sData[i].selected = false;
 			// }
 			this.userGroupsAll.setSizeLimit(data.user_groups.length);
 			this.userGroupsAll.setProperty("/groupsAll", data.user_groups);
 		},
 		_onGroupsReadFail: function (error) {
 			this.userGroupsAll.setProperty("/groupsAll", []);
 		},
 		_onDetailMatch: function (oContext) {
 			var userDetails = oContext.getParameter("data");
 			if (userDetails) {
 				this.userModel.setProperty("/userDetails", userDetails.context);
 				// var cloneDetails = {};

 				this.getView().getModel("ui").setProperty("/editVisible", true);
 				this.getView().getModel("ui").setProperty("/listDeleteMode", "None");

 				this._cloneUserDetails();
 				this._getGroups();
 				// var userDetailsTab = this.getView().byId("userDetailsId");
 				this._changeModel(false);
 				// userDetailsTab.addContent(this.userDetailsDisplayFragment);
 			}
 		},
 		_onPageNavButtonPress: function () {
 			this.getOwnerComponent().getRouter().getTargets().display("MasterPage");
 		},
 		_resetPasswordModel: function () {

 			return {
 				"newPassword": "",
 				"confirmPassword": "",
 				"initialPassword": ""
 			};
 		},
 		_onResetPassword: function (oEvent) {
 			this.userModel.setProperty("/resetPassword", this._resetPasswordModel());
 			this.resetPasswordPopover.openBy(oEvent.getSource());
 		},
 		_validatePassword: function (resetPassword) {

 			if (resetPassword.confirmPassword && resetPassword.newPassword) {
 				if (resetPassword.confirmPassword !== resetPassword.newPassword) {
 					this._showMessageToastByKey("restPasswordMismatch");
 					return false;
 				}
 				if (resetPassword.confirmPassword.length < 8) {
 					this._showMessageToastByKey("restPasswordMinLength");
 					return false;
 				}

 				var passw = "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$";
 				// /^[A-Za-z]\w{7,14}$/;
 				if (!resetPassword.newPassword.match(passw)) {
 					this._showMessageToastByKey("passwordStrength");
 					return false;
 				}

 				return true;
 			} else {
 				this._showMessageToastByKey("restPasswordBlank");
 				return false;
 			}
 		},
 		_onResetPasswordSave: function (oEvent) {

 			var resetPassword = this.userModel.getProperty("/resetPassword");
 			var flag = this._validatePassword(resetPassword);
 			if (flag) {

 				var userDetails = this.userModel.getProperty("/userDetails");
 				var userDetailsUpdated = this._prepareCreateUpdateData(userDetails);
 				userDetailsUpdated.password = resetPassword.newPassword;

 				$.ajax({
 					url: "/VIVOIDP/scim/Users/" + userDetails.id,
 					type: 'PUT',
 					data: JSON.stringify(userDetailsUpdated),
 					success: this._onResetPasswordSuccess.bind(this),
 					error: this._onResetPasswordFail.bind(this),
 					beforeSend: function (xhr, settings) {
 						xhr.setRequestHeader('Content-Type', 'application/scim+Json');
 					}
 				});
 			}
 		},
 		_onResetPasswordSuccess: function (data) {
 			//oEvent.responseText
 			var oModel = this.getView().getModel("i18n");
 			var userPasswordResetSuccess = oModel.getResourceBundle().getText("userPasswordResetSuccess");
 			MessageToast.show(userPasswordResetSuccess);
 			this.resetPasswordPopover.close();
 		},
 		_onResetPasswordFail: function (oEvent) {
 			//error
 			// var oModel = this.getView().getModel("i18n");
 			// var userPasswordResetFail = oModel.getResourceBundle().getText("userPasswordResetFail");
 			MessageToast.show(oEvent.responseText);
 			this.resetPasswordPopover.close();
 		},

 		_onResetPasswordCancel: function (oEvent) {
 			this.resetPasswordPopover.close();
 		},
 		_onSetInitial: function (oEvent) {
 			var oModel = this.getView().getModel("i18n");
 			var userDeleteSuccess = oModel.getResourceBundle().getText("mailConfrimation");
 			MessageBox.confirm(userDeleteSuccess, {
 				onClose: this._onSetInitialConfim.bind(this)
 			});

 			// this.initialPasswordPopover.setPlacement(sap.m.PlacementType.Auto);
 			// this.initialPasswordPopover.openBy(oEvent.getSource());
 		},
 		_onSetInitialConfim: function (oEvent) {
 			if (oEvent === "OK") {
 				var userDetails = this.userModel.getProperty("/userDetails");
 				var data = {
 					"identifier": userDetails.emails[0].value
 				};
 				$.ajax({
 					url: "/VIVOIDP/users/forgotPassword",
 					type: 'POST',
 					data: JSON.stringify(data),
 					success: this._onInitialPasswordSuccess.bind(this),
 					error: this._onInitialPasswordFail.bind(this),
 					beforeSend: function (xhr, settings) {
 						xhr.setRequestHeader('Content-Type', 'application/json');
 					}
 				});
 			}
 		},
 		// _onInitialPasswordSave: function (oEvent) {
 		// 	
 		// 	var userDetails = this.userModel.getProperty("/userDetails");
 		// 	var data = {
 		// 		"identifier": userDetails.emails[0].value
 		// 	};
 		// 	$.ajax({
 		// 		url: "VIVOIDP/users/forgotPassword",
 		// 		type: 'POST',
 		// 		data: JSON.stringify(data),
 		// 		success: this._onInitialPasswordSuccess.bind(this),
 		// 		error: this._onInitialPasswordFail.bind(this),
 		// 		beforeSend: function (xhr, settings) {
 		// 			xhr.setRequestHeader('Content-Type', 'application/scim+Json');
 		// 		}
 		// 	});

 		// },
 		_onInitialPasswordSuccess: function (data) {
 			//save
 			// this.initialPasswordPopover.close();
 			var oModel = this.getView().getModel("i18n");
 			var userPasswordInitSuccess = oModel.getResourceBundle().getText("userPasswordInitSuccess");
 			MessageToast.show(userPasswordInitSuccess);
 		},
 		_onInitialPasswordFail: function (oEvent) {
 			var oModel = this.getView().getModel("i18n");
 			var userPasswordInitFail = oModel.getResourceBundle().getText("userPasswordInitFail");
 			MessageToast.show(userPasswordInitFail);
 		},
 		// _onInitialPasswordCancel: function (oEvent) {
 		// 	this.initialPasswordPopover.close();
 		// },
 		_onUserEdit: function (oEvent) {
 			this._changeModel(true);
 			// this._loadChangeFragment();
 		},
 		_onUserEditCancel: function () {
 			var userDetailsClone = this.userModel.getProperty("/userDetailsClone");
 			this.userModel.setProperty("/userDetails", userDetailsClone);
 			this._cloneUserDetails();
 			this._changeModel(false);
 		},

 		_prepareCreateUpdateData: function (userDetails) {

 			var data = {
 				"id": userDetails.id,
 				"displayName": userDetails.displayName,
 				"active": (userDetails.active === true) ? true : false,
 				"userName": userDetails.userName,
 				"emails": [{
 					"value": userDetails.emails[0].value,
 					"primary": true
 				}],
 				"name": {
 					"givenName": userDetails.name.givenName,
 					"familyName": userDetails.name.familyName
 				},
 				"userType": "customer",
 				"mailVerified": "true",
 				"groups": userDetails.groups ? userDetails.groups : []
 			};
 			return data;
 		},
 		updateUserSuccess: function (data) {
 			var oModel = this.getView().getModel("i18n");
 			var userUpdateMsg = oModel.getResourceBundle().getText("userUpdateSuccess");
 			MessageToast.show(userUpdateMsg);

 			this._changeModel(false);
 			this._cloneUserDetails();

 			this.fnUpdateUserMaster("update"); // added on 18th March, 2020 to update user master data
 		},
 		updateUserFail: function (oEvent) {
 			var oModel = this.getView().getModel("i18n");
 			var userUpdateFail = oModel.getResourceBundle().getText("userUpdateFailed");
 			MessageToast.show(userUpdateFail);
 		},
 		_loadEditChangeFragment: function (sName) {
 			if (this.userEditChangeFragment) {
 				this.userEditChangeFragment.destroy();
 			}

 			this.userEditChangeFragment = sap.ui.xmlfragment("com.usr.managementv2.fragments." + sName, this);
 			this.getView().addDependent(this.userEditChangeFragment);

 			return this.userEditChangeFragment;
 			// this.userDetailsChangeFragment = sap.ui.xmlfragment("com.usr.managementv2.fragments." + sName, this);
 			// this.getView().addDependent(this.userDetailsChangeFragment);
 		},
 		_changeModel: function (editMode) {
 			var uiModel = this.getView().getModel("ui");
 			uiModel.setProperty("/editVisible", !editMode);
 			var userDetailsTab = this.getView().byId("userDetailsId");
 			if (editMode) {
 				// userDetailsTab.removeContent(this.userDetailsDisplayFragment);
 				userDetailsTab.addContent(this._loadEditChangeFragment("UserDetailsChange"));
 				uiModel.setProperty("/listDeleteMode", "Delete");
 			} else {
 				// userDetailsTab.removeContent(this.userDetailsChangeFragment);
 				userDetailsTab.addContent(this._loadEditChangeFragment("UserDetailsDisplay"));
 				uiModel.setProperty("/listDeleteMode", "None");
 			}
 		},
 		_onUserDelete: function () {

 			var oModel = this.getView().getModel("i18n");
 			var userDeleteSuccess = oModel.getResourceBundle().getText("userDeleteConfirm");

 			MessageBox.confirm(userDeleteSuccess, {
 				onClose: this._onUserDeleteConfim.bind(this)
 			});

 		},
 		_onUserDeleteConfim: function (oEvent) {
 			if (oEvent === "OK") {
 				var userDetails = this.userModel.getProperty("/userDetails");
 				$.ajax({
 					url: "/VIVOIDP/scim/Users/" + userDetails.id,
 					type: 'DELETE',
 					success: this._deleteUserSuccess.bind(this),
 					error: this._deleteUserFail.bind(this),
 					beforeSend: function (xhr, settings) {
 						xhr.setRequestHeader('Content-Type', 'application/scim+Json');
 					}
 				});
 			}
 		},
 		_onCoreHtmlRendering: function (oEvent) {

 			var htmltext = "&lt;p&gt;Password must be between 8 and 16 characters with at least one&lt;/p&gt;&lt;ul&gt;" +
 				"&lt;li&gt;One upper case letter&lt;/li&gt;&lt;li&gt;One lower case letter&lt;/li&gt;" +
 				"&lt;li&gt;And one number or special character&lt;/li&gt;&lt;/ul&gt;";

 			return htmltext;
 		},
 		_deleteUserSuccess: function (data) {
 			var oModel = this.getView().getModel("i18n");
 			var userDeleteSuccess = oModel.getResourceBundle().getText("userDeleteSuccess");
 			MessageToast.show(userDeleteSuccess);
 			this._changeModel(false);
 			this.getOwnerComponent().getRouter().getTargets().display("MasterPage");

 			this.fnUpdateUserMaster("delete"); // To delete from PostgreSQL database added on 18th March, 2020
 		},
 		_deleteUserFail: function (oEvent) {
 			var oModel = this.getView().getModel("i18n");
 			var userDeleteFail = oModel.getResourceBundle().getText("userDeleteFail");
 			MessageToast.show(userDeleteFail);
 		},
 		_onGroupAssignPress: function (oEvent) {
 			var that = this;
 			this.groupPopover.setPlacement(sap.m.PlacementType.Auto);
 			var aGroupsAll = this.userGroupsAll.getProperty("/groupsAll");
 			if (aGroupsAll) {
 				var aAddedGroups = this.userModel.getProperty("/userDetails/groups");

 				// this.aUsrGrpArray.push("KE_OS");
 				if (this.aUsrGrpArray && this.aUsrGrpArray.toString().indexOf("Vivo_Energy_Admin") > -1) {
 					var newArray = aGroupsAll.filter(function (el, x) {
 						var vExists = [];
 						vExists.pop();
 						// for (var a in that.aUsrGrpArray) {
 						vExists.push(el.name.substr(2, 1) == "_");
 						// }

 						if (vExists.toString().indexOf("true") != -1) {
 							return el;
 						}
 					});

 					aGroupsAll = newArray;
 				} else if (this.aUsrGrpArray.toString().indexOf("_OS") > -1) { //Do not sort data based on country for the Admin user

 					var vLen = that.aUsrGrpArray.length;

 					for (var i = 0; i < vLen; i++) {
 						if (that.aUsrGrpArray[i].substr(2, 3) == "_OS") {
 							continue;
 						} else {
 							that.aUsrGrpArray.splice(i, 1);
 							i--;
 							vLen--;
 						}
 					}

 					var newArray = aGroupsAll.filter(function (el) {
 						var vExists = [];
 						vExists.pop();
 						for (var a in that.aUsrGrpArray) {
 							vExists.push(el.name == that.aUsrGrpArray[a] || el.name.substr(0, 3) == that.aUsrGrpArray[a].substr(0, 3));
 						}

 						if (vExists.toString().indexOf("true") != -1) {
 							return el;
 						}
 					});

 					aGroupsAll = newArray;
 				}

 				aAddedGroups = aAddedGroups ? aAddedGroups : [];
 				for (var i = 0; i < aGroupsAll.length; i++) {
 					aGroupsAll[i].type = "Active";
 					aGroupsAll[i].visible = true;

 					if (this.isVivoHeadOffice) {
 						//
 					} else if (this.isMultipleGroup) {

 						for (var s = 0; s < this.aMultipleGroup.length; s++) {
 							if (!aGroupsAll[i].name.startsWith(this.aMultipleGroup[i])) {
 								aGroupsAll[i].visible = false;
 							}
 						}
 						//

 					}
 					for (var j = 0; j < aAddedGroups.length; j++) {
 						if (aGroupsAll[i].name === aAddedGroups[j].display) {
 							aGroupsAll[i].type = "Inactive";
 							break;
 						}
 					}
 				}
 				this.userGroupsAll.setProperty("/groupsAll", aGroupsAll);
 			} else {
 				this.userGroupsAll.setProperty("/groupsAll", []);
 			}

 			this.groupPopover.openBy(oEvent.getSource());
 		},
 		_onGroupSelect: function (oEvent) {

 			var listItem = oEvent.getParameter('listItem');
 			// Commented on 2nd April
 			// if (listItem && listItem.getType() === "Inactive") {
 			// 	listItem.setSelected(false)
 			// 	var oModel = this.getView().getModel("i18n");
 			// 	var groupAlreadyAssigned = oModel.getResourceBundle().getText("groupAlreadyAssigned");
 			// 	MessageToast.show(groupAlreadyAssigned);
 			// }

 		},
 		_onSearch: function (oEvent) {
 			var aFilters = [];
 			var oSource = oEvent.getSource();
 			var sQuery = oSource.getValue();
 			if (sQuery && sQuery.length > 0) {
 				var filter = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sQuery);
 				var filter2 = new sap.ui.model.Filter("display_name", sap.ui.model.FilterOperator.Contains, sQuery);
 				aFilters.push(filter);
 				aFilters.push(filter2);

 				var orFilter = new sap.ui.model.Filter({
 					filters: aFilters,
 					and: false
 				});
 			}

 			// update list binding
 			var oList = oSource.getParent().getContent()[1];
 			var oBinding = oList.getBinding("items");
 			oBinding.filter(orFilter, "Application");
 		},
 		_cloneUserDetails: function () {
 			var userDetails = this.userModel.getProperty("/userDetails");

 			var cloneDetails = $.extend(true, {}, userDetails);
 			this.userModel.setProperty("/userDetailsClone", cloneDetails);
 		},
 		_onGroupDelete: function (oEvent) {

 			var oModel = this.getView().getModel("i18n");
 			var groupUnAssign = oModel.getResourceBundle().getText("groupUnAssign");
 			var oitem = oEvent.getParameter('listItem').getBindingContext().getObject();

 			MessageBox.confirm(groupUnAssign, {
 				onClose: this._onGroupUnAssignConfim.bind(this, oEvent.getSource(), oitem)
 			});

 		},
 		_onGroupUnAssignConfim: function (oList, itemToDelete, oEvent) {
 			if (oEvent === "OK") {

 				var userDetails = this.userModel.getProperty("/userDetails");
 				var data = this._prepareCreateUpdateData(userDetails);
 				data.groups.splice(data.groups.indexOf(itemToDelete), 1);
 				data.id = userDetails.id;

 				this.oSelItemTitle = itemToDelete.value; // Added on 26th April to handle update site master mail ids

 				this._groupSaveRequest(data, true);
 				if (itemToDelete.value.indexOf("_SITE") > -1 || itemToDelete.value.indexOf("_QM") > -1) {
 					this.fnGetSiteMaster(itemToDelete.value, true);
 				}

 			}
 		},
 		_onUserAssignSave: function (oEvent) {
 			var list = this.groupPopover.getContent()[1];
 			var aItems = list.getSelectedItems();
 			var userDetails = this.userModel.getProperty("/userDetails");
 			var data = this._prepareCreateUpdateData(userDetails);
 			data.id = userDetails.id;
 			for (var i = 0; i < aItems.length; i++) {

 				var item = aItems[i].getBindingContext("userGroupsAll").getObject();
 				var groupData = {
 					"value": item.name
 				};
 				data.groups.push(groupData);
 			}

 			// -------------------------------------------------------------- //
 			// Modified on 11th May 2020
 			// -------------------------------------------------------------- //
 			var vSelectedGrp = aItems[0].getTitle();
 			this.oSelItemTitle = vSelectedGrp;
 			if (vSelectedGrp.indexOf("_CM") > -1) { // Allow multiple group to be assigned 
 				this._groupSaveRequest(data);
 			} else { // Will check and replace user on confrimation
 				this.fnCheckUserAssignment(aItems, userDetails, data);
 			}
 		},
 		// ====================================================================== //
 		// Check for user assignement to the selected objects added by Farooq on 22nd Jan 2020
 		// ====================================================================== //
 		fnCheckUserAssignment: function (aItems, userDetails, data) {
 			var MultiGrps = [];
 			MultiGrps.pop();
 			for (var i = 0; i < aItems.length; i++) {
 				var item = aItems[i].getBindingContext("userGroupsAll").getObject();
 				var groupData = {
 					"id": item.id,
 					"value": item.name,
 					"UserPID": userDetails.id,
 					"displayName": item.display_name
 				};
 				MultiGrps.push(groupData);
 			}

 			this.vGrpLen = MultiGrps.length;
 			this.vMessageCollections = [];
 			this.vMessageCollections.pop();
 			var vInit = 0; // Pass initail value
 			this.fnGetGroupDetails(MultiGrps, vInit, data);
 		},
 		// ====================================================================== //
 		// Service call to get user assignemnt to the groups added by Farooq on 22nd Jan 2020
 		// ====================================================================== //
 		fnGetGroupDetails: function (MultiGrps, itemPos, data) {
 			var that = this;
 			var sURL = "/VIVOIDP/scim/Groups/" + MultiGrps[itemPos].id;
 			jQuery.ajax({
 				"url": sURL,
 				"method": "GET",
 				error: function (jqXHR, textStatus, errorThrown) {
 					sap.ui.core.BusyIndicator.hide();
 					var sMessage = jqXHR.status + " " + jqXHR.statusText + " " + jqXHR.responseText;
 					jQuery.sap.log.error("Data loading", sMessage, "index.html");
 					sap.m.MessageToast.show(sMessage);
 				},
 				success: function (oData, textStatus, jqXHR) {
 					that.vGrpLen = that.vGrpLen - 1;
 					if (that.vGrpLen == 0) {
 						if (oData.members) {
 							that.vMessageCollections.push(MultiGrps[itemPos].value);
 						}
 						that.fnShowMessages(data, MultiGrps);
 						sap.ui.core.BusyIndicator.hide();
 					} else {
 						if (oData.members) {
 							that.vMessageCollections.push(MultiGrps[itemPos].value);
 						}
 						itemPos = itemPos + 1;
 						that.fnGetGroupDetails(MultiGrps, itemPos, data);
 					}
 				}
 			});
 		},
 		// ====================================================================== //
 		// Display messages for confirmation added by Farooq on 22nd Jan 2020
 		// ====================================================================== //
 		fnShowMessages: function (data, MultiGrps) {
 			var that = this;
 			var vLen = this.vMessageCollections.length;

 			if (vLen == 0) {
 				that._groupSaveRequest(data);
 				if (MultiGrps[0].value.indexOf("_SITE") > -1 || MultiGrps[0].value.indexOf("_QM") > -1) {
 					that.fnGetSiteMaster(MultiGrps[0].value);
 				}

 				this.oSelItemTitle = MultiGrps[0].value; // Added on 26th April 2020 to handle Updating site master mail IDs
 				return null;
 			}
 			var vMessage = "\n\n";
 			for (var i = 0; i < vLen; i++) {
 				// vMessage = vMessage + "<li>" + this.vMessageCollections[i] + "</li>";
 				vMessage = vMessage + (i + 1) + ". " + this.vMessageCollections[i] + "\n";
 			}
 			// vMessage = vMessage + "</ol>";

 			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
 			var vMessageHeader = "The following group(s) are already assigned with user(s) \n Do you want to Replace existing users?" +
 				vMessage;
 			MessageBox.show(vMessageHeader, {
 				icon: MessageBox.Icon.WARNING,
 				title: "Warning",
 				actions: ["Replace", "Cancel Assignment"],
 				// details: vMessage,
 				styleClass: bCompact ? "sapUiSizeCompact" : "",
 				onClose: function (sAction) {
 					if (sAction == "Replace") {
 						that.vGrpLen = MultiGrps.length;
 						that.fnUpdateGroup(MultiGrps, 0, data);
 					}
 				}
 			});
 		},
 		// ====================================================================== //
 		// Update user group added by Farooq on 22nd Jan 2020
 		// ====================================================================== //
 		fnUpdateGroup: function (MultiGrps, pos, data) {
 			var that = this;
 			var oSaveData = {
 				"id": MultiGrps[pos].id,
 				"displayName": MultiGrps[pos].displayName,
 				"members": [{
 					"value": MultiGrps[pos].UserPID
 				}]
 			};
 			sap.ui.core.BusyIndicator.show();
 			$.ajax({
 				url: "/VIVOIDP/scim/Groups/" + MultiGrps[pos].id,
 				type: 'PUT',
 				data: JSON.stringify(oSaveData),
 				beforeSend: function (xhr, settings) {
 					xhr.setRequestHeader('Content-Type', 'application/scim+Json');
 				},
 				error: function (jqXHR, textStatus, errorThrown) {
 					sap.ui.core.BusyIndicator.hide();
 					var sMessage = jqXHR.status + " " + jqXHR.statusText + " " + jqXHR.responseText;
 					jQuery.sap.log.error("Data loading", sMessage, "index.html");
 					sap.m.MessageToast.show(sMessage);
 				},
 				success: function (oData, textStatus, jqXHR) {
 					that.vGrpLen = that.vGrpLen - 1;
 					if (that.vGrpLen == 0) {
 						// if (MultiGrps[pos].value.indexOf("_SITE") > -1 || MultiGrps[pos].value.indexOf("_QM") > -1) {
 						// 	that.fnGetSiteMaster(MultiGrps[pos].value);
 						// } else if (MultiGrps[pos].value.indexOf("_CM") > -1) { // Added on 28th April 2020 to handle Qualtrics Mailing List
 						// 	this.fnGetQualtricsMailing(false);
 						// }
						that._onGroupAssignSuccess(false, data);						
 						
 						var oModel = that.getView().getModel("i18n");
 						var userGroupAssignSuccess = oModel.getResourceBundle().getText("userGroupAssignSuccess");
 						MessageToast.show(userGroupAssignSuccess);
 						that.userModel.setProperty("/userDetails/groups", data.groups);
 						that._cloneUserDetails();
 						sap.ui.core.BusyIndicator.hide();
 					} else {
 						if (MultiGrps[pos].value.indexOf("_SITE") > -1 || MultiGrps[pos].value.indexOf("_QM") > -1) {
 							that.fnGetSiteMaster(MultiGrps[pos].value);
 						} else if (MultiGrps[pos].value.indexOf("_CM") > -1) { // Added on 28th April 2020 to handle Qualtrics Mailing List
 							this.fnGetQualtricsMailing(false);
 						}
 						pos = pos + 1;
 						that.fnUpdateGroup(MultiGrps, pos, data);
 					}
 				}

 			});
 		},

 		_groupSaveRequest: function (data, vUnassign) {
 			data.active = (data.active === true) ? true : false;
 			$.ajax({
 				url: "/VIVOIDP/scim/Users/" + data.id,
 				// "/VIVOIDP/scim/Users/" + userDetails.id,
 				type: 'PUT',
 				data: JSON.stringify(data),
 				success: this._onGroupAssignSuccess.bind(this, vUnassign),
 				error: this._onGroupAssignFail.bind(this),
 				beforeSend: function (xhr, settings) {
 					xhr.setRequestHeader('Content-Type', 'application/scim+Json');
 				}
 			});
 		},
 		_onGroupAssignSuccess: function (vUnassign, data) {
 			var oModel = this.getView().getModel("i18n");
 			if (vUnassign) {
 				var userGroupUnassignSuccess = oModel.getResourceBundle().getText("userGroupUnassignSuccess");
 				MessageToast.show(userGroupUnassignSuccess);
 			} else {
 				var userGroupAssignSuccess = oModel.getResourceBundle().getText("userGroupAssignSuccess");
 				MessageToast.show(userGroupAssignSuccess);
 			}

 			this.userModel.setProperty("/userDetails/groups", data.groups);
 			// var cloneDetails = {};
 			this._cloneUserDetails();
 			// ----------------------------------------------------------------------------------- //
 			// Added on 26th April 2020 for update site master data
 			// ----------------------------------------------------------------------------------- //
 			var vUpdateValue, vUpdateField, vLookUpKey, vLookUpValue;
 			if (this.oSelItemTitle !== undefined && this.oSelItemTitle.indexOf("_TM") > -1) { // When TM is selcted
 				vUpdateField = "tmEmail";
 				vLookUpKey = "surveyDescNew";
 				if (vUnassign) {
 					// vUpdateValue = this.aUserDetails.email; // TM Email
 					vUpdateValue = null; // TM Email
 					vLookUpValue = this.oSelItemTitle; // Lookup Field
 				} else {
 					var userDetails = this.userModel.getProperty("/userDetails");
 					vUpdateValue = userDetails.emails[0].value;
 					vLookUpValue = this.oSelItemTitle; // Lookup Field
 				}

 				this.fnUpdateTMData(vUpdateField, vUpdateValue, vLookUpKey, vLookUpValue);
 			} else if (this.oSelItemTitle !== undefined && (this.oSelItemTitle.indexOf("_QM") > -1 || this.oSelItemTitle.indexOf("_SITE") > -1)) { // When SITE or QM is selcted
 				var SelectedUserMailID = this.userModel.getProperty("/userDetails").emails[0].value;
 				if (vUnassign) {
 					if (this.oSelItemTitle.indexOf("_SITE") > -1) {
 						vUpdateField = "retailerEmail";
 					} else {
 						vUpdateField = "qmEmail";
 					}

 					vUpdateValue = this.aUserDetails.email; // Retailer Email or QM Email
 					vLookUpKey = "siteName";
 					vLookUpValue = this.oSelItemTitle; // Lookup Field
 				} else {
 					if (this.oSelItemTitle.indexOf("_SITE") > -1) {
 						vUpdateField = "retailerEmail";
 					} else {
 						vUpdateField = "qmEmail";
 					}
 					vUpdateValue = SelectedUserMailID; // Retailer Email or QM Email
 					vLookUpKey = "siteName";
 					vLookUpValue = this.oSelItemTitle; // Lookup Field
 				}

 				this.fnUpdateTMData(vUpdateField, vUpdateValue, vLookUpKey, vLookUpValue);
 			} else if (this.oSelItemTitle !== undefined && this.oSelItemTitle.indexOf("_OS") > -1) { // When OS is selcted added on 8th Aug 2020
 				vUpdateField = "osmEmail";
 				vLookUpKey = "siteOU";
 				if (vUnassign) {
 					vUpdateValue = this.aUserDetails.email; // logged in user to be considerd as OS
 					vLookUpValue = this.oSelItemTitle.substr(0, 2); // Lookup Field
 				} else {
 					userDetails = this.userModel.getProperty("/userDetails");
 					vUpdateValue = userDetails.emails[0].value;
 					vLookUpValue = this.oSelItemTitle.substr(0, 2); // Lookup Field
 				}

 				this.fnUpdateTMData(vUpdateField, vUpdateValue, vLookUpKey, vLookUpValue);
 			} else if (this.oSelItemTitle !== undefined && this.oSelItemTitle.indexOf("_CM") > -1) { // Added on 28th April 2020 to handle Qualtrics Mailing List
 				this.fnGetQualtricsMailing(vUnassign);
 			}
 			// ----------------------------------------------------------------------------------- //
 			// End of code on 26th April 2020 for update site master data
 			// ----------------------------------------------------------------------------------- //

 			this.groupPopover.close();
 		},

 		_onGroupAssignFail: function (error) {
 			var oModel = this.getView().getModel("i18n");
 			var userGroupAssignFail = oModel.getResourceBundle().getText("userGroupAssignFail");
 			MessageToast.show(userGroupAssignFail);
 		},
 		_onUserAssignCancel: function (oEvent) {
 			this.groupPopover.close();
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
 		_validateAddUserDetails: function (data) {

 			//check for blank
 			// var data = createModel.getData();
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

 			var form = this.userEditChangeFragment.getItems()[0];
 			var formElemtns = form.getContent();
 			for (var i = 0; i < formElemtns.length; i++) {

 				var oInput = formElemtns[i];
 				if (oInput instanceof sap.m.Input) {
 					// this._onNameChangeValidate(oInput);
 					if (oInput.getValueState() === sap.ui.core.ValueState.Error) {
 						this._showMessageToastByKey("errorFileds");
 						return false;
 					}
 				}

 			}
 			return true;
 		},
 		onLoginNameFormatter: function (firstName, familyName) {
 			firstName = firstName.trim().replace(/ /g, "");
 			familyName = familyName.trim().replace(/ /g, "");
 			return firstName + "." + familyName;
 			// 
 		},
 		_onUserEditSave: function () {

 			var userDetails = this.userModel.getProperty("/userDetails");
 			var flag = this._validateAddUserDetails(userDetails);
 			if (flag) {
 				$.ajax({
 					url: "/VIVOIDP/scim/Users/" + userDetails.id,
 					type: 'PUT',
 					data: JSON.stringify(this._prepareCreateUpdateData(userDetails)),
 					success: this.updateUserSuccess.bind(this),
 					error: this.updateUserFail.bind(this),
 					beforeSend: function (xhr, settings) {
 						xhr.setRequestHeader('Content-Type', 'application/scim+Json');
 					}
 				});
 			}
 		},
 		_showMessageToastByKey: function (key) {
 			var oModel = this.getView().getModel("i18n");
 			var userCreateSuccessMsg = oModel.getResourceBundle().getText(key);
 			MessageToast.show(userCreateSuccessMsg);
 		},
 		// ================================================================================ //
 		// Function to get SITE Master record
 		// ================================================================================ //
 		fnGetSiteMaster: function (objName, unAssign) {
 			var that = this;
 			var sURL = "/SITE_CONFIG/fetchsitedata?offset=0&pageNo=300&sapLocationId=" + Number(objName.split("_")[1]) + "";
 			jQuery.ajax({
 				type: "GET",
 				url: sURL,
 				error: function (jqXHR, textStatus, errorThrown) {
 					var sMessage = jqXHR.status + " " + jqXHR.statusText + " " + jqXHR.responseText;
 					jQuery.sap.log.error("Data loading", sMessage, "index.html");
 					sap.m.MessageToast.show(sMessage);
 					sap.ui.core.BusyIndicator.hide();
 				},
 				success: function (oData, textStatus, jqXHR) {
 					if (oData.length > 0) {
 						that.fnUpdateSiteMaster(oData, unAssign, objName);
 					}
 					sap.ui.core.BusyIndicator.hide();
 				}
 			});
 		},
 		// ================================================================================ //
 		// Function to Update SITE master
 		// ================================================================================ //
 		fnUpdateSiteMaster: function (data, unAssign, objName) {
 			var that = this;
 			// data[0].siteObjectGroupId = objGrpID;
 			// data[0].objectGroupParentId = objGrpParentID;

 			var SelectedUserMailID = that.userModel.getProperty("/userDetails").emails[0].value;
 			if (unAssign) {
 				data[0].siteMeasuredData = "";
 				//  Modified on 2nd April 2020 for point no 204
 				if (objName.indexOf("_SITE") > -1) {
 					data[0].retailerEmail = this.aUserDetails.email;
 				} else {
 					data[0].qmEmail = this.aUserDetails.email;
 				}

 				// Added on 27th April 2020 change systemId from 1 to 3 on disallocation
 				data[0].systemId = 3;
 			} else {
 				data[0].siteMeasuredData = this.aUserDetails.email;
 				// data[0].retailerEmail = this.aUserDetails.email;
 				// data[0].qmEmail = this.aUserDetails.email;

 				//  Modified on 2nd April 2020 for point no 204
 				if (objName.indexOf("_SITE") > -1) {
 					data[0].retailerEmail = SelectedUserMailID;
 				} else {
 					data[0].qmEmail = SelectedUserMailID;
 				}

 				// Added on 27th April 2020 change systemId from 3 to 1 on allocation
 				data[0].systemId = 1;
 			}

 			var sURL = "/SITE_CONFIG/saveSiteData";
 			jQuery.ajax({
 				type: "PUT",
 				url: sURL,
 				data: (JSON.stringify(data[0])).replace(/""/g, null),
 				contentType: "application/json",
 				error: function (jqXHR, textStatus, errorThrown) {
 					var sMessage = jqXHR.status + " " + jqXHR.statusText + " " + jqXHR.responseText;
 					jQuery.sap.log.error("Data loading", sMessage, "index.html");
 					sap.m.MessageToast.show(sMessage);
 					sap.ui.core.BusyIndicator.hide();
 				},
 				success: function (oData, textStatus, jqXHR) {
 					sap.ui.core.BusyIndicator.hide();
 				}
 			});
 		},
 		// ====================================================================== //
 		// Update PostgreSQL database added on 18th March, 2020
 		// ====================================================================== //
 		fnUpdateUserMaster: function (updateOrDelete) {
 			var that = this;
 			var userDetails = this.userModel.getProperty("/userDetails");
 			var data = {
 				"idpId": userDetails.id,
 				"siteRetailerEmail": userDetails.emails[0].value,
 				"siteRetailerFirstName": userDetails.name.givenName,
 				"siteRetailerLastName": userDetails.name.familyName,
 				"siteRetailerMobile": "",
 				"siteRetailerCombo": userDetails.name.givenName + "." + userDetails.name.familyName
 			};

 			var sURL = "/UserMicroService/" + updateOrDelete;
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
 		},
 		// ====================================================================== //
 		// Update Site Master database added on 26th April, 2020
 		// ====================================================================== //
 		fnUpdateTMData: function (vUpdateField, vUpdateValue, vLookUpKey, vLookUpValue) {
 			// var that = this;
 			var data = {
 				"updateFieldList": [{
 					"updateField": vUpdateField,
 					"updateValue": vUpdateValue
 				}],
 				"lookUpList": [{
 					"lookUpKey": vLookUpKey,
 					"lookUpValue": vLookUpValue
 				}]
 			};

 			var sURL = "/SiteUpdateMicroService";
 			jQuery.ajax({
 				type: "POST",
 				url: sURL,
 				data: (JSON.stringify(data)).replace(/""/g, null),
 				contentType: "application/json",
 				error: function (jqXHR, textStatus, errorThrown) {
 					var sMessage = jqXHR.status + " " + jqXHR.statusText + " " + jqXHR.responseText;
 					jQuery.sap.log.error("Data loading", sMessage, "index.html");
 					sap.m.MessageToast.show(sMessage);
 				},
 				success: function (oData, textStatus, jqXHR) {
 					sap.m.MessageToast.show("PostgreSQL Database is updated successfully");
 				}
 			});
 		},
 		// ====================================================================== //
 		// Get Qualtrics Mailing List added on 28th April 2020 by Farooq
 		// ====================================================================== //
 		fnGetQualtricsMailing: function (vUnassign) {
 			var that = this;
 			var sURL = "/QualtricsMailingList/mailinglists";

 			jQuery.ajax({
 				type: "GET",
 				url: sURL,
 				error: function (jqXHR, textStatus, errorThrown) {
 					var sMessage = jqXHR.status + " " + jqXHR.statusText + " " + jqXHR.responseText;
 					jQuery.sap.log.error("Data loading", sMessage, "index.html");
 					sap.m.MessageToast.show(sMessage);
 					sap.ui.core.BusyIndicator.hide();
 				},
 				success: function (oData, textStatus, jqXHR) {
 					var JSONData = oData.result.elements;
 					var filteredArray = JSONData.filter(function (obj) {
 						return obj.name == that.oSelItemTitle
 					});

 					if (vUnassign) {
 						that.fnQualtricsGetContact(filteredArray[0].id);
 					} else {
 						that.fnQualtricsCreateContact(filteredArray[0].id);
 					}
 					sap.ui.core.BusyIndicator.hide();
 				}
 			});
 		},

 		// ====================================================================== //
 		// Create Qualtrics Contact added on 28th April 2020 by Farooq
 		// ====================================================================== //
 		fnQualtricsCreateContact: function (MailingID) {
 			var that = this;
 			var sURL = "/QualtricsMailingList/directories/POOL_3XiQMUEuYcqumkh/mailinglists/" + MailingID + "/contacts";
 			var userDetails = this.userModel.getProperty("/userDetails");
 			var oCountryData = this.loadCountryData();
 			var filteredArray = oCountryData.filter(function (obj) {
 				return obj.key == that.oSelItemTitle.split("_")[0]
 			});
 			debugger
 			var data = {
 				"firstName": userDetails.name.givenName,
 				"lastName": userDetails.name.familyName,
 				"email": userDetails.emails[0].value,
 				"embeddedData": {
 					"country": filteredArray[0].text,
 				}
 			};

 			jQuery.ajax({
 				type: "POST",
 				url: sURL,
 				data: (JSON.stringify(data)).replace(/""/g, null),
 				contentType: "application/json",
 				error: function (jqXHR, textStatus, errorThrown) {
 					debugger
 					var sMessage = jqXHR.status + " " + jqXHR.statusText + " " + jqXHR.responseText;
 					jQuery.sap.log.error("Data loading", sMessage, "index.html");
 				},
 				success: function (oData, textStatus, jqXHR) {
 					debugger
 					sap.m.MessageToast.show("updated successfully");
 				}
 			});
 		},
 		// ====================================================================== //
 		// Get Qualtrics Contact added on 28th April 2020 by Farooq
 		// ====================================================================== //
 		fnQualtricsGetContact: function (MailingID) {
 			var that = this;
 			var sURL = "/QualtricsMailingList/directories/POOL_3XiQMUEuYcqumkh/mailinglists/" + MailingID + "/contacts";

 			jQuery.ajax({
 				type: "GET",
 				url: sURL,
 				error: function (jqXHR, textStatus, errorThrown) {
 					var sMessage = jqXHR.status + " " + jqXHR.statusText + " " + jqXHR.responseText;
 					jQuery.sap.log.error("Data loading", sMessage, "index.html");
 					sap.m.MessageToast.show(sMessage);
 					sap.ui.core.BusyIndicator.hide();
 				},
 				success: function (oData, textStatus, jqXHR) {
 					var vContactID = oData.result.elements[0].contactId;
 					that.fnQualtricsDeleteContact(MailingID, vContactID);
 					sap.ui.core.BusyIndicator.hide();
 				}
 			});
 		},
 		// ====================================================================== //
 		// Delete Qualtrics Contact added on 28th April 2020 by Farooq
 		// ====================================================================== //
 		fnQualtricsDeleteContact: function (MailingID, vContactID) {
 			var that = this;
 			var sURL = "/QualtricsMailingList/directories/POOL_3XiQMUEuYcqumkh/mailinglists/" + MailingID + "/contacts/" + vContactID;

 			jQuery.ajax({
 				type: "DELETE",
 				url: sURL,
 				error: function (jqXHR, textStatus, errorThrown) {
 					var sMessage = jqXHR.status + " " + jqXHR.statusText + " " + jqXHR.responseText;
 					jQuery.sap.log.error("Data loading", sMessage, "index.html");
 					sap.m.MessageToast.show(sMessage);
 					sap.ui.core.BusyIndicator.hide();
 				},
 				success: function (oData, textStatus, jqXHR) {
 					sap.m.MessageToast.show("Qualtrics updated successfully");
 					sap.ui.core.BusyIndicator.hide();
 				}
 			});

 		},
 		// ====================================================================== //
 		// Get Country List added on 28th April 2020 by Farooq
 		// ====================================================================== //
 		loadCountryData: function () {
 			var e = [{
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
 			}, {
 				text: "Zambia",
 				key: "ZM",
 				currency: "ZMW"
 			}, {
 				text: "Malawi",
 				key: "MW",
 				currency: "MWK"
 			}, {
 				text: "Zimbabwe",
 				key: "ZW",
 				currency: "USD"
 			}, {
 				text: "Reunion",
 				key: "RE",
 				currency: "EUR"
 			}, {
 				text: "Gabon",
 				key: "GA",
 				currency: "XAF"
 			}, {
 				text: "Rwanda",
 				key: "RW",
 				currency: "RWF"
 			}, {
 				text: "Tanzania",
 				key: "TZ",
 				currency: "TZS"
 			}, {
 				text: "Mozambique",
 				key: "MZ",
 				currency: "MZN"
 			}];
 			return e;
 		}

 	});

 });
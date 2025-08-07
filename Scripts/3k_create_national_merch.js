/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search', 'N/log', 'N/format'],
    function (record, runtime, search, log, format) {
        const proceso = 'TEK - Crear Nacionalización Mercadería';

        //IDS CAMPOS PERSONALIZADOS - AJUSTE DE INVENTARIO
        var ADJ_TYPE_FIELD = 'custbody_tek_tipo_ajuste_inventario';
        var NAT_MERCH_REL_FIELD = 'custbody_tek_national_merch_related';
        var NAT_DESTI_LOC_FIELD = 'custbody_tek_ubicacion_destino';
        var NAT_EXCHANGERATE_FIELD = 'custbody_tek_tipo_cambio_despacho_impo';

        //IDS CAMPOS PERSONALIZADOS - NACIONALIZACION
        var NAT_MERCH_RECORD = 'custompurchase_tek_nac';
        var NAT_ADJ_INV_RELATED_FIELD = 'custbody_tek_ajuste_inv_relacionado';
        var NAT_SERIAL_NUMBER_COL = 'custcol_tek_dbt_num_inv';

        // IDS DE CAMPOS PERSONALIZADOS - REGISTRO CONFIGURACION
        var NAT_CONFIG_RECORD = 'customrecord_tek_national_configuration';

        var NAT_FORM_TRANS_FIELD = 'custrecord_tek_form_transaction';

        var NAT_FORM_FIELD = 'custrecord_tek_form_national';
        var NAT_CURRENCY_FIELD = 'custrecord_tek_currency_national';
        var NAT_ENTITY_FIELD = 'custrecord_tek_entity_national';
        var NAT_ACCOUNT_FIELD = 'custrecord_tek_national_account';
        var NAT_ACCOUNT_BILL_FIELD = 'custrecord_tek_national_account_bills';
        var NAT_COST_CATEGORY_FIELD = 'custrecord_tek_national_cost_category';
        var NAT_ACCOUNT_MERCH_FIELD = 'custrecord_tek_national_account_merch';
        var NAT_STATUS_DETAIL_INV_FIELD = 'custrecord_tek_national_inv_det_status';

        // IDS DE CAMPOS ESTÁNDAR
        var DESPACHO_FIELD = 'cseg_tek_despacho';
        var EMBARQUE_FIELD = 'cseg_tek_embarque'

        //BUSQUEDAS
        var INV_DETAIL_SEARCH = 'customsearch_tek_item_inventory_detail';
        var RATE_CFI_SEARCH = 'customsearch_tek_costo_cif_lote_detalle';
        var COST_ZFI_SEARCH = 'customsearch_tek_costo_zfi_lote_detalle';
        var COST_STANDAR_SEARCH = 'customsearch_3k_standar_cost_sum_nationa'


        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
        }


        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            try {
                if (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) {
                    var scriptRecord = scriptContext.newRecord;

                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('TEST Inicio afterSubmit', usage);

                    var newRecord = record.load({
                        type: record.Type.INVENTORY_ADJUSTMENT,
                        id: scriptRecord.id,
                        isDynamic: true
                    });
                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('usage newRecord', usage);

                    var rptValidateFields = validateFields(newRecord);

                    log.debug('rptValidateFields', JSON.stringify(rptValidateFields));
                    if (rptValidateFields.error || !rptValidateFields.esCorrecto) {
                        log.debug(proceso, 'No cumple con los requisitos para ejecutar el script');
                        return
                    }
                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('usage rptValidateFields', usage);

                    var rptGetConfiguration = getConfigurationNational(rptValidateFields.form)
                    if (rptGetConfiguration.error || !rptGetConfiguration.esCorrecto) {
                        throw rptGetConfiguration.mensaje;
                    }
                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('usage rptGetConfiguration', usage);

                    var rptGetBodyFields = getBodyFields(newRecord)
                    if (rptGetBodyFields.error || !rptGetBodyFields.esCorrecto) {
                        throw rptGetBodyFields.mensaje;
                    }
                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('usage getBodyFields', usage);

                    var rptGetInventoryDetail = getInventoryDetail(newRecord)
                    if (rptGetInventoryDetail.error || !rptGetInventoryDetail.esCorrecto) {
                        throw rptGetInventoryDetail.mensaje;
                    }
                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('usage getInventoryDetail', usage);

                    var rptGroupAndSumItems = groupAndSumItems(rptGetInventoryDetail.items);
                    if (rptGroupAndSumItems.error || !rptGroupAndSumItems.esCorrecto) {
                        throw rptGroupAndSumItems.mensaje;
                    }

                    var rptGetItemsTransaction = getItemsTransaction(newRecord);
                    if (rptGetItemsTransaction.error || !rptGetItemsTransaction.esCorrecto) {
                        throw rptGetItemsTransaction.mensaje;
                    }

                    var rptValidateItems = validateItems(rptGetItemsTransaction.items, rptGroupAndSumItems.items);
                    if (rptValidateItems.error || !rptValidateItems.esCorrecto) {
                        throw rptValidateItems.mensaje;
                    }

                    var creationInfo = {
                        'configuration': rptGetConfiguration.configuration,
                        'fields': rptGetBodyFields.bodyFields,
                        'items': rptGetInventoryDetail.items,
                        // 'landedCost': rptGetInventoryDetail.landedCostTotal
                    }
                    var rptCreateNationalMerch = createNationalMerchanRecord(newRecord, creationInfo)
                    if (rptCreateNationalMerch.error || !rptCreateNationalMerch.esCorrecto) {
                        throw rptCreateNationalMerch.mensaje;
                    }

                    var idNational = rptCreateNationalMerch.recordId;

                    record.submitFields({
                        type: record.Type.INVENTORY_ADJUSTMENT,
                        id: newRecord.id,
                        values: {
                            custbody_tek_national_merch_related: idNational,
                            custbody_tek_national_status: 'Nacionalización mercadería\n Creado Exitosamente'
                        },
                        options: { ignoreMandatoryFields: true }
                    });

                    // generateExpenses(idNational, creationInfo)
                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('TEST Fin afterSubmit', usage);
                }
            } catch (exception) {
                record.submitFields({
                    type: record.Type.INVENTORY_ADJUSTMENT,
                    id: newRecord.id,
                    values: { custbody_tek_national_status: exception },
                    options: { ignoreMandatoryFields: true }
                });
                log.debug('EXCEPCIÓN - afterSubmit - Descripción: ', JSON.stringify(exception));
            }
        }

        /**
         * Valida los campos necesarios para ejecutar el script de creación de nacionalización de mercadería.
         * @param {Record} objRecord - Registro a ser validado.
         * @returns {Object} - Objeto con información sobre la validación.
         */
        function validateFields(objRecord) {
            log.debug(proceso, 'INICIO PROCESO - Validar campos para ejecutar el script');

            var respuesta = { error: false, esCorrecto: false, adjustmentType: '', transaction: '', form: '' };
            try {
                respuesta.adjustmentType = objRecord.getValue({ fieldId: ADJ_TYPE_FIELD });
                if (!respuesta.adjustmentType) {
                    throw 'El campo "DBT - TIPO AJUSTE DE INVENTARIO" no está lleno';
                }

                respuesta.transaction = objRecord.getValue({ fieldId: NAT_MERCH_REL_FIELD });
                if (respuesta.transaction) {
                    throw 'Ya existe una nacionalización creada';
                }

                respuesta.form = objRecord.getValue({ fieldId: 'customform' });
                if (!respuesta.form) {
                    throw 'No tiene formulario asignado';
                }

                respuesta.esCorrecto = true;
            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'EXCEPCIÓN - Validar campos para ejecutar el script - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'validateFields - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Validar campos para ejecutar el script');
            return respuesta;
        }

        /**
         * Función para obtener la configuración de Nacionalización.
         * @param {string} formId ID del formulario de transacción.
         * @returns {Object} Respuesta de la búsqueda que incluye la configuración de Nacionalización si se encuentra.
         */
        function getConfigurationNational(formId) {
            log.debug(proceso, 'INICIO PROCESO - Obtener configuración de la Nacionalización');
            var respuesta = { error: false, esCorrecto: false, configuration: {} };
            try {
                var configurationObj = search.create({
                    type: NAT_CONFIG_RECORD,
                    filters: [
                        ["isinactive", "is", "F"], "AND",
                        [NAT_FORM_TRANS_FIELD, "anyof", formId]
                    ],
                    columns: [
                        search.createColumn({ name: NAT_FORM_FIELD }),
                        search.createColumn({ name: NAT_CURRENCY_FIELD }),
                        search.createColumn({ name: NAT_ENTITY_FIELD }),
                        search.createColumn({ name: NAT_ACCOUNT_FIELD }),
                        search.createColumn({ name: NAT_ACCOUNT_BILL_FIELD }),
                        search.createColumn({ name: NAT_COST_CATEGORY_FIELD }),
                        search.createColumn({ name: NAT_ACCOUNT_MERCH_FIELD }),
                        search.createColumn({ name: NAT_STATUS_DETAIL_INV_FIELD })
                    ]
                });
                var resultSet = configurationObj.run();
                var searchResults = resultSet.getRange({ start: 0, end: 1 });

                if (searchResults.length <= 0) {
                    throw 'No existe una configuración para este formulario (' + formId + ')';
                }
                respuesta.configuration = {
                    form: searchResults[0].getValue({ name: resultSet.columns[0] }),
                    currency: searchResults[0].getValue({ name: resultSet.columns[1] }),
                    entity: searchResults[0].getValue({ name: resultSet.columns[2] }),
                    account: searchResults[0].getValue({ name: resultSet.columns[3] }),
                    accountBill: searchResults[0].getValue({ name: resultSet.columns[4] }),
                    categoryCost: searchResults[0].getValue({ name: resultSet.columns[5] }),
                    accountBillMerch: searchResults[0].getValue({ name: resultSet.columns[6] }),
                    statusInvDetail: searchResults[0].getValue({ name: resultSet.columns[7] }),
                };
                respuesta.esCorrecto = true;
            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'EXCEPCIÓN - Obtener configuración de la Nacionalización - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'getConfigurationNational - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Obtener configuración de la Nacionalización');
            return respuesta;
        }

        /**
         * Obtiene los campos de cabecera necesarios del Ajuste de inventario para el proceso de nacionalización de mercadería.
         * @param {Record} newRecord - Nuevo registro.
         * @returns {Object} - Objeto con la información de los campos de cabecera.
         */
        function getBodyFields(newRecord) {
            log.debug(proceso, 'INICIO PROCESO - Obtener campos de cabecera');

            var respuesta = { error: false, esCorrecto: false, bodyFields: {} };
            try {
                respuesta.bodyFields = {
                    'dispatch': {
                        id: newRecord.getValue({ fieldId: DESPACHO_FIELD }),
                        value: newRecord.getText({ fieldId: DESPACHO_FIELD }),
                    },
                    'locationDestination': newRecord.getValue({ fieldId: NAT_DESTI_LOC_FIELD }),
                    'exchangeRate': newRecord.getValue({ fieldId: NAT_EXCHANGERATE_FIELD }),
                    'subsidiary': newRecord.getValue({ fieldId: 'subsidiary' }),
                    'shipment': {
                        id: newRecord.getValue({ fieldId: EMBARQUE_FIELD }),
                        value: newRecord.getText({ fieldId: EMBARQUE_FIELD }),
                    },
                };
                if (!respuesta.bodyFields.subsidiary) {
                    throw 'No se encontró la subsidiaria de la transacción';
                }
                if (!respuesta.bodyFields.dispatch.id) {
                    throw 'El ajuste no tiene un "DESPACHO" seleccionado';
                }
                // if (!respuesta.bodyFields.dispatch.id) {
                //     throw 'El ajuste no tiene un "EMBARQUE" seleccionado';
                // }
                if (!respuesta.bodyFields.locationDestination) {
                    throw 'El ajuste no tiene una "DBT – UBICACIÓN DESTINO" seleccionada';
                }
                if (!respuesta.bodyFields.exchangeRate) {
                    throw 'El ajuste no tiene un "DBT – TIPO DE CAMBIO DESPACHO IMPORTACIÓN" determinado';
                }
                respuesta.esCorrecto = true;
            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'EXCEPCIÓN - Obtener campos de cabecera - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'getBodyFields - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Obtener campos de cabecera');
            return respuesta;
        }

        /**
         * Obtiene los detalles del inventario asociados al registro.
         * @param {Record} newRecord - Nuevo registro.
         * @returns {Object} - Objeto con la información de los detalles del inventario.
         */
        function getInventoryDetail(newRecord) {
            log.debug(proceso, 'INICIO PROCESO - Obtener los items del inventory Detail');

            var respuesta = { error: false, esCorrecto: false, items: []/*, landedCostTotal: 0 */ };
            try {
                var inventoryDetailSearch = search.load({ id: INV_DETAIL_SEARCH });

                var filterID = search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: newRecord.id
                });

                inventoryDetailSearch.filters.push(filterID);

                var resultSet = inventoryDetailSearch.run();
                var searchResults = resultSet.getRange({ start: 0, end: 1000 });
                log.debug('searchResults', searchResults)

                var usage = runtime.getCurrentScript().getRemainingUsage();
                log.debug('usage getInventoryDetail Inicio', usage);

                if (searchResults && searchResults.length > 0) {

                    var itemDetail = [];
                    for (var i = 0; i < searchResults.length; i++) {
                        itemDetail.push({
                            'item': searchResults[i].getValue({ name: resultSet.columns[0] }),
                            'number': {
                                id: searchResults[i].getValue({ name: resultSet.columns[1] }),
                                value: searchResults[i].getText({ name: resultSet.columns[1] }),
                            },
                            'quantity': searchResults[i].getValue({ name: resultSet.columns[2] }),
                            'locationIn': searchResults[i].getValue({ name: resultSet.columns[3] }),
                            'locationOut': searchResults[i].getValue({ name: resultSet.columns[4] }),
                            'bin': searchResults[i].getValue({ name: resultSet.columns[5] }),
                            // 'units': unitsPerItem
                        });
                        log.debug('itemDetail', itemDetail)
                    }

                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('usage searchItemReceiptsDictionary inicio', usage);

                    var rptSearchItemReceiptDictionary = searchItemReceiptsDictionary(itemDetail);
                    log.debug('rptSearchItemReceiptDictionary', rptSearchItemReceiptDictionary)

                    var itemReceiptDictionary = rptSearchItemReceiptDictionary.results;
                    log.debug('itemReceiptDictionary', itemReceiptDictionary)
                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('usage searchItemReceiptsDictionary medio', usage);
                    for (var i = 0; i < itemDetail.length; i++) {
                        var usage = runtime.getCurrentScript().getRemainingUsage();
                        log.debug('usage getInventoryDetail bucle inicio', usage);

                        var itemSerialNumber = `${itemDetail[i].item}|${itemDetail[i].number.value}`;
                        if (rptSearchItemReceiptDictionary.error || !itemReceiptDictionary[itemSerialNumber]) {
                            throw rptSearchItemReceiptDictionary.mensaje;
                        }
                        itemDetail[i].itemReceiptId = itemReceiptDictionary[itemSerialNumber];
                    }
                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('usage searchItemReceiptsDictionary fin', usage);

                    var rptSearchCostZFIDictionary = searchCostZFIDictionary(itemDetail);
                    log.debug('rptSearchCostZFIDictionary', rptSearchCostZFIDictionary)

                    var costZFIDictionary = rptSearchCostZFIDictionary.results;
                    log.debug('costZFIDictionary', costZFIDictionary)

                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('usage searchCostZFIDictionary fin', usage);

                    var rptSearchRateCFIDictionary = searchRateCFIDictionary(itemDetail);
                    log.debug('rptSearchRateCFIDictionary', rptSearchRateCFIDictionary)

                    var rateCFIDictionary = rptSearchRateCFIDictionary.results;
                    log.debug('rateCFIDictionary', rateCFIDictionary)

                    var usage = runtime.getCurrentScript().getRemainingUsage();
                    log.debug('usage searchRateCFIDictionary fin', usage);


                    for (var i = 0; i < itemDetail.length; i++) {
                        var receiptItemId = `${itemDetail[i].itemReceiptId}|${itemDetail[i].item}`;
                        log.debug('receiptItemId', receiptItemId);

                        if (rptSearchCostZFIDictionary.error) {
                            throw rptSearchCostZFIDictionary.mensaje
                        }
                        log.debug('costZFIDictionary[receiptItemId]', costZFIDictionary[receiptItemId]);
                        itemDetail[i].cost = costZFIDictionary[receiptItemId];


                        if (rptSearchRateCFIDictionary.error) {
                            throw rptSearchRateCFIDictionary.mensaje
                        }
                        log.debug('rateCFIDictionary[receiptItemId]', rateCFIDictionary[receiptItemId]);
                        itemDetail[i].rate = rateCFIDictionary[receiptItemId];

                        respuesta.items.push(itemDetail[i]);
                    }
                }
                if (respuesta.items.length > 0) {
                    respuesta.esCorrecto = true;
                }
                var usage = runtime.getCurrentScript().getRemainingUsage();
                log.debug('usage FINAL getInventoryDetail ', usage);

            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'EXCEPCIÓN - Obtener los items del inventory Detail - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'getInventoryDetail - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Obtener los items del inventory Detail');
            return respuesta;
        }

        function groupAndSumItems(arrayItems) {
            log.debug(proceso, 'INICIO PROCESO - Agrupar items y cantidades - ' + JSON.stringify(arrayItems));

            var respuesta = { error: false, esCorrecto: false, items: [] };
            try {
                var groupedItems = {};
                for (var i = 0; i < arrayItems.length; i++) {
                    var itemId = arrayItems[i].item;
                    var quantity = parseFloat(arrayItems[i].quantity);

                    if (groupedItems[itemId]) {
                        groupedItems[itemId] += quantity;
                    } else {
                        groupedItems[itemId] = quantity;
                    }
                }

                var result = [];
                for (var key in groupedItems) {
                    if (Object.prototype.hasOwnProperty.call(groupedItems, key)) {
                        result.push({
                            item: key,
                            quantity: groupedItems[key]
                        });
                    }
                }

                respuesta.items = result;
                if (respuesta.items.length > 0) {
                    respuesta.esCorrecto = true;
                }
            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'EXCEPCIÓN - Agrupar items y cantidades - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'groupAndSumItems - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Agrupar items y cantidades');
            return respuesta;
        }

        function getItemsTransaction(objRecord) {
            log.debug(proceso, 'INICIO PROCESO - Obtener items de transaccion ');

            var respuesta = { error: false, esCorrecto: false, items: [] };
            try {
                var lineCount = objRecord.getLineCount({ sublistId: 'inventory' });

                for (var i = 0; i < lineCount; i++) {
                    var itemId = objRecord.getSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'item',
                        line: i
                    });

                    var quantity = objRecord.getSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'adjustqtyby',
                        line: i
                    }) * -1;

                    respuesta.items.push({
                        item: itemId,
                        quantity: quantity,
                    });
                }

                if (respuesta.items.length > 0) {
                    respuesta.esCorrecto = true;
                }
            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'EXCEPCIÓN - Obtener items de transaccion - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'getItemsTransaction - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Obtener items de transaccion');
            return respuesta;
        }

        function validateItems(transactionItems, groupedItems) {
            log.debug(proceso, 'INICIO PROCESO - Validar los items ADJ x NAT');

            var respuesta = { error: false, esCorrecto: false };
            try {
                if (transactionItems.length !== groupedItems.length) {
                    throw 'No hay la misma cantidad de items en la nacionalizacion x ajuste'
                }

                var transactionItemsSorted = sortByItem(transactionItems);
                var groupedItemsSorted = sortByItem(groupedItems);

                log.debug('transactionItemsSorted', JSON.stringify(transactionItemsSorted));
                log.debug('groupedItemsSorted', JSON.stringify(groupedItemsSorted));

                for (var i = 0; i < transactionItemsSorted.length; i++) {
                    if (transactionItemsSorted[i].item !== groupedItemsSorted[i].item || transactionItemsSorted[i].quantity !== groupedItemsSorted[i].quantity) {
                        throw 'Comparacion Item' + i;
                    }
                }

                respuesta.esCorrecto = true;
            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'EXCEPCIÓN - Validar los items ADJ x NAT - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'validateItems - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Validar los items ADJ x NAT');
            return respuesta;
        }

        function sortByItem(array) {
            return array.slice().sort(function (a, b) {
                return a.item.localeCompare(b.item);
            });
        }


        function searchItemReceiptsDictionary(itemDetails) {
            const response = { error: false, message: '', results: {} };

            try {
                const serialNumbersToFind = itemDetails.map(d => d.number.value);
                const itemsToFind = [...new Set(itemDetails.map(d => d.item))];

                log.debug('serialNumbersToFind', serialNumbersToFind);
                log.debug('itemsToFind', itemsToFind);

                const itemReceiptSearch = search.create({
                    type: 'itemreceipt',
                    filters: [
                        ["type", "anyof", "ItemRcpt"],
                        "AND",
                        ["item", "anyof", itemsToFind],
                        "AND",
                        ["serialnumber", "isnotempty", ""]
                    ],
                    columns: [
                        "internalid",
                        "item",
                        "serialnumber"
                    ]
                });

                const resultSet = itemReceiptSearch.run();

                let start = 0;
                const pageSize = 1000;
                let resultsBatch;

                do {
                    resultsBatch = resultSet.getRange({ start: start, end: start + pageSize });

                    resultsBatch.forEach(result => {
                        const itemId = result.getValue({ name: "item" });
                        const serialNumber = result.getValue({ name: "serialnumber" });
                        const receiptId = result.getValue({ name: "internalid" });

                        if (serialNumbersToFind.includes(serialNumber)) {
                            const key = `${itemId}|${serialNumber}`;
                            response.results[key] = receiptId;
                        }
                    });

                    start += pageSize;
                } while (resultsBatch.length === pageSize);

            } catch (e) {
                response.error = true;
                response.message = e.message;
            }

            return response;
        }





        /**
         * Función para buscar el ID interno de un recibo de artículo según los detalles del ítem.
         * @param {Object} itemDetail Detalles del ítem que incluyen número y tipo de ítem.
         * @returns {Object} Respuesta de la búsqueda que incluye el ID del recibo si se encuentra.
         */
        function searchItemReceipt(itemDetail) {
            log.debug(proceso, 'INICIO PROCESO - Buscar Recepción de artículo (' + itemDetail.item + ')');
            var respuesta = { error: false, esCorrecto: false, idReceipt: '' };
            try {
                var itemReceiptSearchObj = search.create({
                    type: "itemreceipt",
                    filters: [
                        ["type", "anyof", "ItemRcpt"],
                        "AND",
                        ["serialnumber", "is", itemDetail.number.value],
                        "AND",
                        ["item", "anyof", itemDetail.item]
                    ],
                    columns: [search.createColumn({ name: "internalid", label: "ID interno" })]
                });
                var resultSet = itemReceiptSearchObj.run();
                var searchResults = resultSet.getRange({ start: 0, end: 1 });
                if (searchResults && searchResults.length <= 0) {
                    throw "No se encontró la recepción del artículo";
                }
                respuesta.idReceipt = searchResults[0].getValue({ name: resultSet.columns[0] });
                respuesta.esCorrecto = true;
            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'Excepción - Buscar Recepción de artículo (' + itemDetail.item + ') - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'searchItemReceipt - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Buscar Recepción de artículo (' + itemDetail.item + ')');
            return respuesta;
        }

        /**
         * Función para buscar y calcular el costoZFI de varios ítems.
         * @param {Array} itemDetails Arreglo de objetos con item, itemReceiptId y quantity.
         * @returns {Object} Diccionario con claves "itemReceiptId|itemId" y valores de costoZFI calculado.
         */
        function searchCostZFIDictionary(itemDetails) {
            const response = { error: false, message: '', results: {} };

            try {
                const receiptIds = [...new Set(itemDetails.map(d => d.itemReceiptId))];
                const itemIds = [...new Set(itemDetails.map(d => d.item))];

                const costSearch = search.load({ id: COST_ZFI_SEARCH });

                costSearch.filters.push(search.createFilter({
                    name: 'internalidnumber',
                    operator: search.Operator.ANYOF,
                    values: receiptIds
                }));

                costSearch.filters.push(search.createFilter({
                    name: 'item',
                    operator: search.Operator.ANYOF,
                    values: itemIds
                }));

                const resultSet = costSearch.run();
                log.debug('resultSet', resultSet)
                let start = 0;
                const pageSize = 1000;
                let resultsBatch;

                do {
                    resultsBatch = resultSet.getRange({ start: start, end: start + pageSize });
                    log.debug('resultsBatch', resultsBatch)
                    resultsBatch.forEach(result => {
                        const itemId = result.getValue(result.columns[0]);
                        const receiptId = result.getValue(result.columns[1]);

                        const quantity = parseFloat(result.getValue(result.columns[2]));
                        const cost = parseFloat(result.getValue(result.columns[3]));

                        log.debug('result', { receiptId, itemId, quantity, cost })
                        if (!isNaN(quantity) && quantity !== 0 && !isNaN(cost)) {
                            const key = `${receiptId}|${itemId}`;

                            response.results[key] = + (cost / quantity);
                            log.debug('response.results[key]', response.results[key])
                        }
                    });

                    start += pageSize;
                } while (resultsBatch.length === pageSize);

            } catch (e) {
                response.error = true;
                response.message = 'Error al cargar costos ZFI: ' + e.message;
                log.error('searchCostZFIDictionary', response.message);
            }

            return response;
        }


        /**
         * Función para buscar y calcular el costoZFI de un ítem.
         * @param {Object} itemDetail Detalles del ítem que incluyen el ID del recibo y la cantidad.
         * @returns {Object} Respuesta de la búsqueda que incluye el costoZFI calculado si se encuentra.
         */
        function searchCostZFI(itemDetail) {
            log.debug(proceso, 'INICIO PROCESO - Buscar y calcular costoZFI de item');

            var respuesta = { error: false, esCorrecto: false, cost: '' };
            try {
                var searchCostZFI = search.load({ id: COST_ZFI_SEARCH });

                var idFilter = search.createFilter({
                    name: 'internalidnumber',
                    operator: "equalto",
                    values: itemDetail.itemReceiptId
                });
                searchCostZFI.filters.push(idFilter);

                var itemFilter = search.createFilter({
                    name: 'item',
                    operator: "anyof",
                    values: itemDetail.item
                });
                searchCostZFI.filters.push(itemFilter);

                var resultSet = searchCostZFI.run();
                var searchResults = resultSet.getRange({ start: 0, end: 1000 });

                if (searchResults && searchResults.length > 0) {
                    var quantity = searchResults[0].getValue({ name: resultSet.columns[1] });
                    var cost = searchResults[0].getValue({ name: resultSet.columns[2] });

                    respuesta.cost = parseFloat(itemDetail.quantity) * (parseFloat(cost) / parseFloat(quantity));
                }
                if (respuesta.cost >= 0) {
                    respuesta.esCorrecto = true;
                }
            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'Excepcion - Buscar y calcular costoZFI de item - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'searchCostZFI - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Buscar y calcular costoZFI de item');
            return respuesta;
        }

        /**
         * Función para buscar y calcular los montos CFI de una lista de ítems.
         * Retorna un diccionario con claves formadas por 'itemReceiptId|item'.
         * 
         * @param {Array} itemDetails - Lista de objetos con los campos itemReceiptId e item.
         * @returns {Object} Diccionario con los montos CFI por ítem y recibo.
         */
        function searchRateCFIDictionary(itemDetails) {
            const response = { error: false, message: '', results: {} };

            try {
                const receiptIds = [...new Set(itemDetails.map(d => d.itemReceiptId))];
                const itemIds = [...new Set(itemDetails.map(d => d.item))];

                const rateSearch = search.load({ id: RATE_CFI_SEARCH });

                rateSearch.filters.push(search.createFilter({
                    name: 'internalidnumber',
                    operator: search.Operator.ANYOF,
                    values: receiptIds
                }));

                rateSearch.filters.push(search.createFilter({
                    name: 'item',
                    operator: search.Operator.ANYOF,
                    values: itemIds
                }));

                const resultSet = rateSearch.run();
                let start = 0;
                const pageSize = 1000;
                let resultsBatch;

                do {
                    resultsBatch = resultSet.getRange({ start: start, end: start + pageSize });

                    resultsBatch.forEach(result => {
                        const itemId = result.getValue(result.columns[0]);
                        const receiptId = result.getValue(result.columns[1]);

                        const quantity = parseFloat(result.getValue(result.columns[2]));
                        const rate = parseFloat(result.getValue(result.columns[3]));

                        if (!isNaN(quantity) && quantity !== 0 && !isNaN(rate)) {
                            const key = `${receiptId}|${itemId}`;
                            response.results[key] = +(rate / quantity);
                        }
                    });

                    start += pageSize;
                } while (resultsBatch.length === pageSize);

            } catch (e) {
                response.error = true;
                response.message = 'Error al cargar montos CFI: ' + e.message;
                log.error('searchRateCFIDictionary', response.message);
            }

            return response;
        }


        /**
         * Busca y calcula el monto CFI de un artículo.
         * @param {object} itemDetail - Detalle del artículo.
         * @returns {object} - Objeto con la respuesta.
         */
        function searchRateCFI(itemDetail) {
            log.debug(proceso, 'INICIO PROCESO - Buscar y calcular monto CFI de item');

            var respuesta = { error: false, esCorrecto: false, rate: '' };
            try {
                var searchRateCFI = search.load({ id: RATE_CFI_SEARCH });

                var idFilter = search.createFilter({
                    name: 'internalidnumber',
                    operator: "equalto",
                    values: itemDetail.itemReceiptId
                });
                searchRateCFI.filters.push(idFilter);

                var itemFilter = search.createFilter({
                    name: 'item',
                    operator: "anyof",
                    values: itemDetail.item
                });
                searchRateCFI.filters.push(itemFilter);

                var resultSet = searchRateCFI.run();
                var searchResults = resultSet.getRange({ start: 0, end: 1000 });

                if (searchResults && searchResults.length > 0) {
                    var quantity = searchResults[0].getValue({ name: resultSet.columns[1] });
                    var rate = searchResults[0].getValue({ name: resultSet.columns[2] });

                    respuesta.rate = (parseFloat(rate) / parseFloat(quantity));
                }
                if (respuesta.rate >= 0) {
                    respuesta.esCorrecto = true;
                }
            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'Excepcion - Buscar y calcular monto CFI de item - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'searchRateCFI - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Buscar y calcular monto CFI de item');
            return respuesta;
        }

        /**
         * Función para crear un registro de Nacionalización mercadería.
         * @param {Record} newRecord - Nuevo registro.
         * @param {Object} creationInfo Información de creación.
         * @returns {Object} Respuesta de la creación del registro.
         */
        function createNationalMerchanRecord(newRecord, creationInfo) {
            log.debug(proceso, 'INICIO PROCESO - Crear registro de Nacionalización mercadería');
            log.debug('newRecord', newRecord);
            log.debug('creationInfo', creationInfo);
            var respuesta = { error: false, esCorrecto: false, recordId: '' };
            try {
                var exchangeRate = creationInfo.fields.exchangeRate;
                var tempAdjustmentDate = newRecord.getValue({ fieldId: 'trandate' });
                var adjustmentDate = format.format({
                    value: tempAdjustmentDate,
                    type: format.Type.DATE
                });
                log.debug('adjustmentDate', adjustmentDate);
                // Crear el registro de Nacionalización mercadería
                var objRecord = record.create({
                    type: NAT_MERCH_RECORD,
                    isDynamic: true
                });

                log.debug('objRecord', objRecord);

                // Establecer valores en el registro
                objRecord.setValue({ fieldId: 'customform', value: creationInfo.configuration.form, });
                objRecord.setValue({ fieldId: 'entity', value: creationInfo.configuration.entity, });
                objRecord.setValue({ fieldId: 'subsidiary', value: creationInfo.fields.subsidiary, });
                objRecord.setValue({ fieldId: 'currency', value: creationInfo.configuration.currency, });
                objRecord.setValue({ fieldId: 'exchangerate', value: exchangeRate, });
                objRecord.setValue({ fieldId: 'account', value: creationInfo.configuration.account, });
                objRecord.setValue({ fieldId: DESPACHO_FIELD, value: creationInfo.fields.dispatch.id, });
                objRecord.setValue({ fieldId: 'tranid', value: creationInfo.fields.dispatch.value, });
                objRecord.setValue({ fieldId: NAT_ADJ_INV_RELATED_FIELD, value: newRecord.id, });
                objRecord.setValue({ fieldId: 'location', value: creationInfo.items[0].locationOut });
                objRecord.setValue({ fieldId: EMBARQUE_FIELD, value: creationInfo.fields.shipment.id, });
                objRecord.setValue({ fieldId: 'landedcostperline', value: true, });

                var itemArray = [];
                for (var i = 0; i < creationInfo.items.length; i++) {
                    var itemId = creationInfo.items[i].item;
                    var location = creationInfo.items[i].locationIn;
                    itemArray.push({ itemId, location });
                }
                log.debug('itemArray', itemArray)

                var standarCostArray = getStandardCostSumDictionary(itemArray, adjustmentDate)
                log.debug('standarCostArray', standarCostArray)

                if (standarCostArray.error) {
                    throw standarCostArray.mensaje
                }


                // Iterar sobre los elementos de items para agregarlos al registro
                for (var i = 0; i < creationInfo.items.length; i++) {
                    var location = creationInfo.items[i].locationIn; //UBICACION DE AJUSTE
                    objRecord.selectNewLine({ sublistId: 'item' });
                    var itemId = creationInfo.items[i].item;
                    var quantityItem = creationInfo.items[i].quantity;
                    // var unitsItem = creationInfo.items[i].units;

                    var key = itemId + '-' + location;
                    var rptSumCostNow = parseFloat(standarCostArray.costMap[key])

                    log.debug('rptSumCostNow', rptSumCostNow);

                    // Calcular el rate convertido a USD
                    log.debug('Calcular el rate convertido a USD (rateInUSD = rptSumCostNow / exchangeRate)', { rptSumCostNow, exchangeRate, rptSumCostNow })
                    var rateInUSD = rptSumCostNow / exchangeRate

                    log.debug('rateInUSD', rateInUSD);

                    objRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
                    objRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantityItem });
                    objRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: NAT_SERIAL_NUMBER_COL, value: creationInfo.items[i].number.id });
                    objRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: DESPACHO_FIELD, value: creationInfo.fields.dispatch.id });
                    objRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: creationInfo.items[i].locationOut });
                    objRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: rateInUSD });

                    // Agregar detalles de inventario al registro
                    var inventoryDetailSubrecord = objRecord.getCurrentSublistSubrecord({
                        sublistId: 'item',
                        fieldId: 'inventorydetail'
                    });
                    inventoryDetailSubrecord.selectNewLine({ sublistId: 'inventoryassignment' });

                    inventoryDetailSubrecord.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', value: creationInfo.fields.dispatch.value });
                    inventoryDetailSubrecord.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: creationInfo.items[i].bin });
                    inventoryDetailSubrecord.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorystatus', value: creationInfo.configuration.statusInvDetail });
                    inventoryDetailSubrecord.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: creationInfo.items[i].quantity });

                    inventoryDetailSubrecord.commitLine({ sublistId: 'inventoryassignment' });

                    objRecord.commitLine({
                        sublistId: 'item'
                    });
                }

                // Guardar el registro y obtener su ID
                respuesta.recordId = objRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
                respuesta.esCorrecto = true;
            } catch (exception) {
                respuesta.error = true;
                respuesta.mensaje = 'EXCEPCIÓN - Crear registro de Nacionalización mercadería - Descripción: ' + JSON.stringify(exception);
                log.error(proceso, respuesta.mensaje);
            }
            log.debug(proceso, 'createNationalMerchanRecord - INFORMACIÓN RESPUESTA: ' + JSON.stringify(respuesta));
            log.debug(proceso, 'FIN PROCESO - Crear registro de Nacionalización mercadería');
            return respuesta;
        }

        function getStandardCostSumDictionary(itemDetails, adjustmentDate) {
            var respuesta = { error: false, esCorrecto: false };

            const itemIds = [...new Set(itemDetails.map(d => d.itemId))];
            const locationIds = [...new Set(itemDetails.map(d => d.location))];

            log.debug('itemIds', itemIds)
            log.debug('locationIds', locationIds)
            try {
                const costStandarSearch = search.load({ id: COST_STANDAR_SEARCH });

                costStandarSearch.filters.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: itemIds
                }));

                costStandarSearch.filters.push(search.createFilter({
                    name: 'location',
                    join: 'transaction',
                    operator: search.Operator.ANYOF,
                    values: locationIds
                }));

                costStandarSearch.filters.push(search.createFilter({
                    name: 'trandate',
                    join: 'transaction',
                    operator: search.Operator.ONORBEFORE,
                    values: adjustmentDate
                }));

                const resultSet = costStandarSearch.run();
                let start = 0;
                const pageSize = 1000;
                let resultsBatch;

                var seenCombinations = {};
                var costMap = {}
                do {
                    resultsBatch = resultSet.getRange({ start: start, end: start + pageSize });

                    log.debug('resultsBatch', resultsBatch)
                    resultsBatch.forEach(result => {

                        var itemId = result.getValue(result.columns[0]);
                        var locationId = result.getValue(result.columns[1]);
                        var trandate = result.getValue(result.columns[2]);
                        var sumCost = result.getValue(result.columns[3]);

                        log.debug('LINEA', { itemId, locationId, trandate, sumCost })

                        var key = itemId + '-' + locationId;

                        if (!seenCombinations[key]) {
                            costMap[key] = parseFloat(sumCost) || 0;
                            seenCombinations[key] = true;
                        }
                    });

                    start += pageSize;
                } while (resultsBatch.length === pageSize);

                respuesta.costMap = costMap;
                respuesta.esCorrecto = true;
            } catch (error) {
                respuesta.error = true;
                respuesta.mensaje = "Error obteniendo el diccionario de las sumatorias del costo estándar: " + error.message;
                log.error('getStandardCostSumDictionary', respuesta.mensaje);
            }
            return respuesta;
        }

        function obtenerSumCostFechaReciente(itemId, locationId, adjustmentDate) {
            var respuesta = { error: false, esCorrecto: false, sumCost: 0 };
            try {
                var itemSearchObj2 = search.create({
                    type: "item",
                    filters:
                        [
                            ["internalid", "anyof", itemId],
                            "AND",
                            ["transaction.type", "anyof", "InvReval"],
                            "AND",
                            ["transaction.costcomponentamount", "greaterthanorequalto", "0.00"],
                            "AND",
                            ["transaction.location", "anyof", locationId],
                            "AND",
                            ["transaction.trandate", "onorbefore", adjustmentDate]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "trandate",
                                join: "transaction",
                                summary: "GROUP",
                                sort: search.Sort.DESC // Ordenar por fecha descendente
                            }),
                            search.createColumn({
                                name: "costcomponentstandardcost",
                                join: "transaction",
                                summary: "SUM",
                                label: "Costo estándar de componente de costo"
                            })
                        ]
                });

                var resultSet = itemSearchObj2.run();
                var searchResults2 = resultSet.getRange({ start: 0, end: 1 });

                if (searchResults2 && searchResults2.length > 0) {
                    var sumCost = searchResults2[0].getValue({
                        name: "costcomponentstandardcost",
                        join: "transaction",
                        summary: "SUM"
                    });
                    var latestTrandate = searchResults2[0].getValue({
                        name: "trandate",
                        join: "transaction",
                        summary: "GROUP"
                    });
                    log.debug('getStandardCostSum', 'Se encontró sumCost con la fecha más reciente: ' + latestTrandate);

                    if (sumCost && !isNaN(parseFloat(sumCost))) {
                        respuesta.sumCost = parseFloat(sumCost) || 0;
                        respuesta.esCorrecto = true;
                    } else {
                        respuesta.error = true;
                        respuesta.mensaje = 'No se encontró un sumCost válido en la búsqueda con fecha más reciente.';
                    }
                } else {
                    respuesta.error = true;
                    respuesta.mensaje = 'No se encontraron resultados para obtener la sumatoria del costo estándar.';
                }

            } catch (error) {
                respuesta.error = true;
                respuesta.mensaje = "Error en obtenerSumCostFechaReciente: " + error.message;
                log.error('obtenerSumCostFechaReciente', respuesta.mensaje);
            }
            return respuesta;
        }

        return {
            afterSubmit: afterSubmit
        };
    });
Meteor.methods({
    //Update AF record
    'deleteAfRecord': function(formName, objectToDelete) {
        dbg('objectToDelete', objectToDelete)
        var theForm = Autof.findOne({
            name: formName
        }).content.form
        dbg('theForm', theForm)
        var theDelete = {}
        theDelete.collection = theForm.collection
        theDelete.docId = objectToDelete.docId
        theDelete.data = _(objectToDelete).omit('docId', 'autodata')
        var isOk = ''
            //pRIMERO METEMOS EL REGISTRO EN EL LOG
        Meteor.call('setLog', 'delete_record', {
            collection: theDelete.collection,
            id: theDelete.docId,
            record: sCols[theDelete.collection].findOne(theDelete.docId)
        }, function(err, res) {
            if (res) {
                //..y si ha funcionado, borramos el registro
                isOk = sCols[theDelete.collection].remove(theDelete.docId)
                if (isOk == 1) {
                    console.log('REGISTRO BORRADO')
                    theDelete.res = {
                        status: 'deleted',
                        id: theDelete.docId
                    }
                } else {
                    theDelete.res = {
                        status: 'undeleted',
                        id: null,
                        info: 'Was not posible delete the record. '
                    }
                }
            } else {
                theDelete.res = {
                    status: 'undeleted',
                    id: null,
                    info: 'Was not posible delete the record. Error in log operation.'
                }
            }
        })
        return theDelete.res
    },
    //Update AF record
    'updateAfRecord': function(formName, formResults) {
        dbg('formName', formName)
        dbg('formResults', formResults)
        var theForm = Autof.findOne({
            name: formName
        }).content.form
        var theSave = {}
        theSave.collection = theForm.collection
        theSave.docId = formResults.docId
        theSave.data = _(formResults).omit('docId', 'autodata')
        _.extend(theSave, validateRecord(theSave.data, theForm))
            //CReamos los datos de auditoría
        var autoData = {
                autouser: Meteor.userId || 'unuser',
                autodate: new Date()
            }
            //_.extend(theSave.data, autoData)
        if (theSave.isValid) {
            var isOk = sCols[theSave.collection].update(theSave.docId, {
                $set: theSave.data, //Actualizamos los datos
                $push: { //Añadimos la información de auditoría
                    autodata: autoData
                }
            })
            if (isOk == 1) {
                Meteor.call('setLog', 'update_record', {
                    collection: theSave.collection,
                    id: theSave.docId
                })
                return {
                    status: 'updated',
                    id: theSave.docId
                }
            } else {
                return {
                    status: 'unsaved',
                    id: null
                }
            }
        } else {
            //dbg("theSave", theSave)
            return {
                status: 'unvalid form',
                info: theSave.info,
                id: null
            }
        }
    },
    //Guardar un registro desde af 
    'addAfRecord': function(formName, formResults) {
        dbg('formName', formName)
        dbg('formResults', formResults)
        var theForm = Autof.findOne({
                name: formName
            }).content.form
            // dbg('theForm', theForm)
        var theSave = {}
        theSave.collection = theForm.collection
        theSave.data = formResults
        _.extend(theSave, validateRecord(theSave.data, theForm))
            //Datos que le añadimos siempre   
        var autoData = {
            autodata: [{
                autouser: Meteor.userId || 'unuser',
                autodate: new Date()
            }]
        }
        _.extend(theSave.data, autoData)
        if (theSave.isValid) {
            var theId = sCols[theSave.collection].insert(theSave.data)
            dbg("theId", theId)
            if (theId) {
                Meteor.call('setLog', 'insert_record', {
                    collection: theSave.collection,
                    id: theId
                })
                return {
                    status: 'saved',
                    id: theId
                }
            } else {
                return {
                    status: 'unsaved',
                    id: null
                }
            }
        } else {
            //dbg("theSave", theSave)
            return {
                status: 'unvalid form',
                info: theSave.info,
                id: null
            }
        }
    },
    //Recuperar un registro
    'getDoc': function(theCollection, theId) {
        return sCols[theCollection].findOne(theId)
    }
});
//Comprueba la validación del formulario en el servidor, en base a diferentes parameros (campos requeridos, seguridad, etc)
function validateRecord(theData, theForm) {
    var theDataCopy = _.extend({}, theData)
    var check = {
        isValid: true,
        info: []
    }
    if (!theData) {
        check.isValid = false
        check.info = 'No hay datos'
        return check
    }
    if (!theForm) {
        check.isValid = false
        check.info = 'No hay form.'
        return check
    }
    //Vamos a convertir the Data en un objeto de una sola dimension...
    _.each(theDataCopy, function(value, key) {
            if (_.startsWith(key, '_')) {
                if (value.length == undefined) { //significa que es un objeto
                    _.each(value, function(oValue, oKey) {
                        theDataCopy[oKey + '.' + key] = oValue
                    })
                } else { // o es un array
                    _.each(value, function(aValue, aIndex) {
                        _.each(aValue, function(aoValue, aoKey) {
                            // dbg('aoKey', aoKey)
                            theDataCopy[aoKey + '.' + (aIndex + 1) + '.' + key] = aoValue
                        })
                    })
                }
                delete theDataCopy[key]
            }
        })
        // dbg("theDataCopy", o2S(theDataCopy))
    _.each(theDataCopy, function(value, key) {
        //Comprobamos required
        theRealKey = key.split('.')[0]
        if ((theForm.fields[theRealKey] || {}).required == false ? false : true) {
            // dbg(theRealKey, 'es requerido')
            if (!value || value == '') {
                check.isValid = false
                check.info.push('<div>Field <strong>' + key + '</strong> required</div>')
            }
        }
    })
    return check
}

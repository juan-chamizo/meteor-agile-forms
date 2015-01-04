aceOptions = {
    maxLines: Infinity,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    // showInvisibles: true,
    highlightGutterLine: true,
    theme: "ace/theme/textmate",
    highlightActiveLine: true,
    mode: "ace/mode/yaml",
    wrap: true,
    tabSize: 2
}
var initialYAML = ''
var initiallNameText = ''
var myFold = {}
editor_cambiado = false
coloreaEtiquetas = function() {
    $('dd[collection]').each(function() {
        var color = onl.randomSeedColor($(this).attr('collection'))
        $(this).css('border-bottom', '3px solid #' + color)
    })
}
var hacer = ''

function lanzarRenderizado() {
    if (hacer) {
        clearTimeout(hacer)
        delete hacer
    }
    hacer = setTimeout(function() {
        if (editor_cambiado === true) {
            $("#ritem").html('')
            tx = jsyaml.load(editor.getValue())
            $('#ritem').fadeOut(200).fadeIn(300)
            renderForm(tx, 'ritem')
        }
    }, 800)
}

function editorCambiado(status) {
    // function isChanged(status) {
    // if(status === true){
    // }else if(status == false){
    // }
    // }
    if (initialYAML != editor.getValue() || initiallNameText != $('li#guardar #nombre').text()) {
        editor_cambiado = true
        $('li#guardar i').removeClass('hide')
        $("div#editor").addClass("modificado")
    } else {
        editor.session.getUndoManager().reset()
        editor_cambiado = false
        $('li#guardar i').addClass('hide')
        $("div#editor").removeClass("modificado")
    }
    colorificaYaml()
}
carga = function carga(nombreForm) {
    obj = {
        state: 'active',
        name: nombreForm
    }

    function cargarItemInicial(nombreItem, callback) {
        res = Autof.findOne(obj)
        callback(res)
    }
    cargarItemInicial(obj.name, function(res) {
        if (res) {
            $('#ritem').html('')
            $("#nombre").text(res.name)
            $("#nombre").attr("itemid", res._id)
            $("#nombre").attr("theType", contentType(res))
            $(".doc[name]").parent().removeClass('active')
            $('.doc#' + res._id).parent().addClass('active')
            editor_cambiado = false
            editor = ace.edit('editor');
            editor.setOptions(aceOptions)
            initialYAML = jsyaml.dump(sanitizeObjectNameKeys(res.content))
            initiallNameText = $('li#guardar #nombre').text()
            editor.setValue(initialYAML)
            editor.on('input', editorCambiado)
            $('li#guardar #nombre').on("input", editorCambiado)
            colorificaYaml()
            editor.gotoLine(1)
            renderForm(res, 'ritem')
            coloreaEtiquetas()
            localStorage.setItem('lastFormAdminChargeName', res.name)
        }
    })
}
colorificaYaml = function colorificaYaml() {
    function tag2Color(cadenas, clase, ambito) {
        if ($.type(cadenas) != 'array') {
            cadenas = [cadenas]
        }
        if (!ambito) {
            ambito = $('div.ace_text-layer')
        }
        cadenas.forEach(function(item) {
            ambito.find('.ace_tag').filter(function() {
                return ($(this).text().trim() == item)
            }).addClass(clase)
        })
    }
    setTimeout(function() {
        coloreaEtiquetas()
        tag2Color(['fields', 'common', 'sources', 'options'], 'level1')
        tag2Color(['form', 'list', 'helpers', 'queries'], 'level0')
        tag2Color(['selectize', 'html', 'enum', 'datetimepicker'], 'collapsible')
        $('div.ace_text-layer .ace_tag:contains(fields)').addClass('level1')
        if (jsyaml.load(editor.getValue()).form) {
            _.each(jsyaml.load(editor.getValue()).form.fields, function(index, key) {
                $('div.ace_content .ace_line:contains("' + key + '")').each(function() {
                    if (_.startsWith($(this).text().trim(), key + ':')) {
                        $('.ace_tag', this).addClass('level2')
                    }
                    if (_.startsWith($(this).text().trim(), '_')) {
                        $('.ace_tag', this).addClass('fieldgroup')
                    }
                })
            })
        }
        if (jsyaml.load(editor.getValue()).list) {
            _.each(jsyaml.load(editor.getValue()).list.sources, function(index, key) {
                $('div.ace_content .ace_line:contains("' + key + '")').each(function() {
                    if (_.startsWith($(this).text().trim(), key + ':')) {
                        $('.ace_tag', this).addClass('level2')
                    }
                    _.each(jsyaml.load(editor.getValue()).list.sources[key].columns, function(index, key2) {
                        $('div.ace_content .ace_line:contains("' + key2 + '")').each(function() {
                            if (_.startsWith($(this).text().trim(), key2 + ':')) {
                                $('.ace_tag', this).addClass('level3')
                            }
                        })
                    })
                })
            })
        }
    }, 1)
}
Template.autoEdit.helpers({
    items: function() {
        return Autof.find({
            state: "active"
        }, {
            content: {
                name: 0
            }
        })
    },
    cargarItemInicial: function() {
        //FIXME esto no deberia funcionar con setTimeout!!!
        Meteor.setTimeout(function() {
            carga(this.vname)
        }, 500)
    }
});
//fixme Parece que no funciona correctamente al hacer update (muestra los antiguos) Revisar!!!
Template.autoEdit.events({
        'click #eliminar': function eliminarItem() {
            var theNameToDelete = $("li#guardar #nombre").text()
            var theIdToDelete = $("li#guardar #nombre").attr('itemid')
            if (confirm("¿Eliminar este item? \n[" + theNameToDelete + "]")) {
                if (theIdToDelete) {
                    var okDelete = Autof.update({
                        _id: theIdToDelete
                    }, {
                        $set: {
                            state: 'deleted',
                            update_date: new Date()
                        }
                    })
                }
                editor.setValue('')
                editor.session.getUndoManager().reset()
                editor_cambiado = false
                $('li#guardar i').addClass('hide')
                $("div#editor").removeClass("modificado")
            }
        },
        'click #idiomas': function() {
            if ($('#translatablewords').length >= 1) {
                $('#translatablewords').toggle()
            } else {
                showTraductionsPanel()
            }
        },
        'click #guardar i': function() {
            var theNameToSave = $("li#guardar #nombre").text()
            var theIdToSave = $("#nombre").attr('itemid')
            if (!editor_cambiado) {
                return false;
            }
            if (confirm("¿Guardar la definición del item \n[" + theNameToSave + "]")) {
                if (theIdToSave) {
                    var okUpdate = Autof.update({
                        _id: theIdToSave
                    }, {
                        $set: {
                            name: theNameToSave + moment().format('YYYYMMDD-HHmmss'),
                            state: 'autobackup',
                            update_date: new Date(),
                        }
                    })
                }
                var theContent = jsyaml.load(editor.getValue())
                var okInsert = Autof.insert({
                    name: theNameToSave,
                    content: desanitizeObjectNameKeys(theContent),
                    create_date: new Date(),
                    update: new Date(),
                    state: "active"
                })
                console.info('Se ha guardado el formulario ' + theNameToSave)
                if (okInsert) {
                    editor_cambiado = false
                    $('li#guardar i').addClass('hide')
                    $("div#editor").removeClass("modificado")
                    $('.doc[name="' + theNameToSave + '"]').parent().addClass('active')
                }
            }
        },
        'input #editor': lanzarRenderizado,
        'click #crear': function crearDocumento(e) {
            if (editor_cambiado) {
                if (confirm("¿El item se ha modificado, pero no se ha guardado aún. \nSe perderán los cambios!! \n\n¿Continuar?") == false) return false;
            }
            $("#ritem").html('')
            $("div#editor").removeClass("modificado")
            $("#nombre").removeAttr("itemid").text(makeId(8))
            defaultForm = jsyaml.dump({
                "form": {
                    "collection": "personas",
                    "title": "Titulo formulario",
                    "modes": "add,update,delete",
                    "permisions": null,
                    "i18n": true,
                    "classes": "none",
                    "fields": {
                        "_bloque_1": null,
                        "field1": {
                            "title": "Un name"
                        },
                        "_bloque_2": {
                            "limit": 1
                        },
                        "field2": {
                            "type": "currency"
                        },
                        "field3": {
                            "enum": "a,b"
                        },
                        "_bloque_3": {
                            "limit": 5
                        },
                        "field4": {
                            "value": "$helper1$"
                        },
                        "field5": {
                            "enum": "queries.lista_personas"
                        }
                    },
                    "common": {
                        "all": {
                            "html": {
                                "placeholder": "Im a field"
                            }
                        },
                        "control": {
                            "input": {
                                "html": {
                                    "placeholder": "Im a input"
                                }
                            }
                        },
                        "type": {
                            "currency": {
                                "html": {
                                    "placeholder": "Im a currency"
                                }
                            }
                        },
                        "block_content": {
                            "_bloque_1": {
                                "html": {
                                    "placeholder": "Im in _bloque_1"
                                }
                            }
                        },
                        "blocks": {
                            "style": "box-shadow: 0px 0px 5px  #777"
                        }
                    }
                },
                "helpers": {
                    "helper1": "eval(makeId(7))"
                },
                "queries": {
                    "lista_personas": {
                        "collection": "personas",
                        "filter": {
                            "nombre": {
                                "$in": ["juan", "pedro"]
                            }
                        },
                        "format": {
                            "sort": {
                                "apellidos": 1
                            },
                            "limit": 14
                        },
                        "value": "[nombre]",
                        "label": "[nombre] + ' ' + [apellidos]",
                        "optgroup": "[apellidos]"
                    }
                }
            })
            editor = ace.edit("editor")
            editor.setOptions(aceOptions)
            editor.setValue(defaultForm)
            setTimeout(function() {
                editor.gotoLine(1)
                colorificaYaml()
                renderForm(jsyaml.load(editor.getValue()), 'ritem')
            }, 10)
        },
        'click #items_existentes .doc[id]': function seleccionarDocumento(e) {
            if (editor_cambiado) {
                if (confirm("¿El item se ha modificado, pero no se ha guardado aún. \nSe perderán los cambios!! \n\n¿Continuar?") == false) {
                    return false;
                }
            }
            $('.doc').parent().removeClass('active')
            $(e.target).parent().addClass('active')
            carga($(e.target).attr('name'))
        },
        'keyup input#filtrar': function filtarLista(e) {
            tx = $(e.target).val()
            $("#items_existentes dd[name]").each(function() {
                if ($(this).text().toUpperCase().indexOf(tx.toUpperCase()) == -1) {
                    $(this).hide(100)
                } else {
                    $(this).show(100)
                }
            })
        },
        'click #ayudacampos': function mostrarAyudaColumnas() {
                helpColumns()
            }
            /*, 'dblclick div.ace_content': function plegarSeccion() {
                var line = editor.getCursorPosition().row + 1
                if (myFold[editor.getSelectedText()] == true) {
                    myFold[editor.getSelectedText()] = false
                    editor.getSession().unfold(line)
                } else {
                    myFold[editor.getSelectedText()] = true
                    editor.getSession().foldAll(line - 1)
                }
                colorificaYaml()
            }
            */
    })
    //Inserta la lista dec ampos disponibles en el editor, para ayuda y referencia
function helpColumns() {
        var src = jsyaml.load(editor.getValue())
        var col = []
        if (src.list) {
            col.push(src.list.sources.main.collection)
            try {
                $.each(src.list.sources, function(key) {
                    if (key != 'main') {
                        col.push(key)
                    }
                })
            } catch (err) {}
        }
        if (src.form) {
            col.push(src.form.collection)
        }
        var tx = ''
        col.forEach(function(val) {
            tx = tx + '\n\n#' + _.pad(val, 40, ' ') + ' | Tipo'
            tx = tx + '\n\#' + _.rpad('-', 40, '-') + ' | ' + _.rpad('-', 10, '-')
            try {
                $.each(cCols[val].findOne(), function(key, value) {
                    tx = tx + '\n\#' + _.rpad(key, 40, ' ') + ' | ' + $.type(value)
                })
            } catch (err) {}
        })
        var pos = editor.getCursorPosition()
        editor.setValue(editor.getValue() + tx)
        colorificaYaml()
        editor.moveCursorToPosition(pos)
        editor.clearSelection()
    }
    //todo Documentar el proceso de eliminar , update  y borrado lógico
    //todo Arreglar las ayudas para que vuelque la estructura de los campos complejos
    // fixme LOs enlaces a backend llevan a la version localhost:3000
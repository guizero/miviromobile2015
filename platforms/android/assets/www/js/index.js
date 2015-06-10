var $servidor = "http://www.miviro.com.br/api/v1";
if (localStorage.getItem('server')) {
    var $servidor = localStorage.getItem('server');
}

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
   
    // Bind Event Listeners
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },

    // deviceready Event Handler
    onDeviceReady: function() {
        app.setup();
        database.initialize();
        app.checkToken();
        app.eventListeners();
    },

     // General code for various purposes
    setup: function() {
        // Configures the notifications plugin
        if (navigator.notification) { // Override default HTML alert with native dialog
              window.alert = function (message) {
                  navigator.notification.alert(
                      message,    // message
                      null,       // callback
                      "Miviro Mobile", // title
                      'OK'        // buttonName
                  );
              };
          }

        // Ajax setup
        $.ajaxSetup({
            dataType : 'json',
            beforeSend: function() {
                app.mobileLoading(); // This will show ajax spinner
            },
            complete: function() {
                $.mobile.loading('hide'); // This will hide ajax spinner
            }
        });

        // Register Handlebars helpers.
        Handlebars.registerHelper("math", function(lvalue, operator, rvalue, options) {
            lvalue = parseFloat(lvalue);
            rvalue = parseFloat(rvalue);
                
            return {
                "+": lvalue + rvalue,
                "-": lvalue - rvalue,
                "*": lvalue * rvalue,
                "/": lvalue / rvalue,
                "%": lvalue % rvalue
            }[operator];
        });

        Handlebars.registerHelper("pegadata", function(data) {
            var s = "";
            var d = new Date();
            d.setTime(data);
            
            return d.strftime('%d/%m/%Y');
        });

        Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {

            switch (operator) {
                case '==':
                    return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '===':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '<=':
                    return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '>=':
                    return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                case '&&':
                    return (v1 && v2) ? options.fn(this) : options.inverse(this);
                case '||':
                    return (v1 || v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        });

        // Closes notifications
        $('.close-big-notification').click(function(){
            $(this).parent().fadeOut();
            return false;
        });

        // Configures both sidebars
        $(function() {
            $( "body>[data-role='panel']" ).panel();
        });

        // Configures back button 
        document.addEventListener("backbutton", onBackKeyDown, false);
        function onBackKeyDown(e) {
          e.preventDefault();
        }

        // Sets servers original value and login background 
        $('#servidor').val($servidor);

        $('#login').backstretch("images/back7.jpg");

    },

    // This is the first action called prior to login. Is the token saved? 
    // If yes, it goes straight to the next_page.
    // Next page will be "#principal" if user is and "admin" or if user admin
    // has set a favorite group (function to be disabled in the future).
    // Next page will be groups page if the user is a tour guide
    checkToken: function() {
        var next_page;
        try {
            if(localStorage.getItem('auth_token')) {
                next_page = '#principal';
                if ((localStorage.getItem('gp')) && (localStorage.getItem('gp') != "nenhum")) {
                    app.selecionaGrupo(localStorage.getItem('gp'));
                    localStorage.setItem('backhistory', '#grupomenu');
                    next_page = '#grupomenu';
                    $('.hideguia').hide();
                }
            } else {
                next_page = '#login';
            }
        } catch (exception) {
            next_page = '#login';
        } finally {
            app.changePage(next_page);
        }
    },

    // Basic page change from Jquery mobile.
    changePage: function(pagina) {
        $(':mobile-pagecontainer').pagecontainer('change', pagina, {
            transition: 'none',
            reverse: true,
            showLoadMsg: true
        });

    },

    // Ajax spinner
    mobileLoading: function() {
        $.mobile.loading( "show", {
          text: "Carregando...",
          textVisible: true,
          theme: "a"
        });
    },

    setMainBackHistory: function() {
        localStorage.getItem('user_or_admin') == "user" ? localStorage.setItem('backhistory', '#grupomenu') : localStorage.setItem('backhistory', '#principal');
    },

    // Sincronização
    sincroniza: function(temporada) {
        if ($.isNumeric(temporada)) {
            localStorage.setItem('temporada', temporada);
        } else {
            return alert('Selecione a temporada');
        }

        $.mobile.loading( "show", {
          text: "Atualizando...",
          textVisible: true,
          theme: "a"
        });
        
        $.ajax({
            type : 'GET',
            url : $servidor + '/sincroniza.json',
            data : {
                auth_token : localStorage.getItem('auth_token'),
                temporada: localStorage.getItem('temporada'),
                tipo : localStorage.getItem('user_or_admin')
            }
        }).success(function jsSuccess(data, textStatus, jqXHR){
            database.importa(data);
            alert('Dados importados com sucesso!');
            if (localStorage.getItem('gp') == (null || "nenhum")) {
                app.changePage('#principal');
            } else {
                app.checkToken();
            }

        }).error(function jsError(jqXHR, textStatus, errorThrown){
            
            console.log(jqXHR);
            console.log(textStatus);
            console.log(errorThrown);
        });
    },

    // Click on buttons.
    eventListeners: function() {
        // Login
        $(document).on('click', '#login_button', function() { // catch the form's submit event
            if ($('#email').val().length === 0 || $('#password').val().length === 0) {
                return alert('Favor inserir e-mail e senha');
            }
            var $session = '/sessions.json';
            var $kind = 'agencia_admin';
            if ($('input[name="user_or_admin"]:checked').val() == "user") {
                 $session =  '/usersessions.json';
                 $kind = 'user';
            }
            var $data_sent = {};
            $data_sent[$kind] = {email : $('input[name="email"]').val(),
                                password : $('input[name="password"]').val()};
            
            localStorage.setItem('user_or_admin', $('input[name="user_or_admin"]:checked').val());
            if($(this)){
                // Send data to server through the ajax call
                // action is functionality we want to call and outputJSON is our data
                    $.ajax({
                        type : 'POST',
                        url : $servidor + $session,
                        data : $data_sent,
                        success: function jsSuccess(data, textStatus, jqXHR) {
                            // Set auth token
                            localStorage.setItem('auth_token', data.data.auth_token);
                            localStorage.setItem('username', data.data.name);
                            app.retrieveTemporadas();
                        },
                        error: function (request,error,a) {
                            // This callback function will trigger on unsuccessful action
                           if (request.status == 401) {
                               alert(jQuery.parseJSON(request.responseText).error);
                              //alert('Usuário ou senha incorretos!');
                           }
                           else {
                               alert('Email ou senha inválidos!');
                           }
                        }
                    });
            } else {
                alert('Favor preencher todos os campos');
            }
            return false; // cancel original event to prevent form submitting
        });

        // Logout
        $('#logout_button').click(function(){
            var $session = '/sessions.json';
            if (localStorage.getItem('user_or_admin') == "user") {
                 $session =  '/usersessions.json';
                 $kind = 'user';
            }
            
            $.ajax({
                type : 'DELETE',
                url : $servidor + $session,
                data : {
                    auth_token : localStorage.getItem('auth_token')
                }
            }).success(function jsSuccess(data, textStatus, jqXHR){
                localStorage.clear();
                localStorage.setItem("rootPage", "#login");
                alert('Você foi desconectado com sucesso');
                app.changePage('#login');
            }).error(function jsError(jqXHR, textStatus, errorThrown){
                localStorage.clear();
                localStorage.setItem("rootPage", "#login");
                alert('Você foi deslogado com sucesso');
                app.changePage('#login');
            });
            
        });

        $('.sincroniza_button').click(function(){
            app.sincroniza($('#temporada-select').val());
        });

        $('.sincroniza_button_menu').click(function(){
            app.sincroniza(localStorage.getItem('temporada'));
        });

        $('.abreconfig').click(function() {
            app.criaGPConfig();
        });

        //// Menu Principal
        // Grupos
        $(document).on('click', '#lista_grupos', function() {
            app.criaListaGrupos();
            localStorage.setItem('backhistory', '#principal');
            app.changePage('#grupos');
        });

        // Seleciona o Grupo
        $(document).on('click', '.gruposelecionado', function() {
            app.selecionaGrupo($(this).data('id'));
        });



        //// Menu Grupos
        
        $(document).on('click', '.menugrupo', function() {
            var $this = $(this);
            localStorage.setItem('backhistory', '#grupomenu');
            if ($this.data('menu') == 'lista') {
                app.changePage('#listapassageirosdogrupo');
            }
            if ($this.data('menu') == 'daybyday') {
                app.changePage('#daybyday');
            }
            if ($this.data('menu') == 'quartos') {
                app.changePage('#quartos');
            }
            if ($this.data('menu') == 'bloqueios') {
                app.changePage('#bloqueios');
            }
            if ($this.data('menu') == 'contarporlista') {
                app.criaContaListaPassageiros($this.data('id'));
                app.changePage('#contarporlista');
            }
            if ($this.data('menu') == 'contarporscan') {
                app.changePage('#contarporscan');
                if (localStorage.getItem('refreshscan') == 'true') {
                    app.criaContaScan($this.data('id'));
                    localStorage.setItem('refreshscan', false);
                }
            }
            if ($this.data('menu') == 'opcionais') {
                app.changePage('#opcionais');
            }
            
        });

        //// Lista Passageiros
        // Ver passageiro
        $(document).on('click', '.paxselecionado', function() {
            var $this = $(this);
            app.mostraPassageiro($(this).data('id'), $(this).data('from'));
            if ($(this).data('from') == '#grupomenu') {
                $( "#sidesearch" ).trigger( "updatelayout" );
                $( "#sidesearch" ).panel( "close" );
            }
        });

        $(document).on('click', '.banquinho', function() {
            var $this = $(this);
            localStorage.otherback = localStorage.backhistory;
            app.abreBanquinho($(this).data('id'));
        });

        //// Back Button
        // Sim, este foi o único meio que encontrei pro back button funcionar...
        $(document).on('click', '.backbutton', function() {
            var $back = localStorage.getItem('backhistory');
            if (localStorage.otherback){
                var $newback = localStorage.otherback;  
            } else {
                var $newback = '';
            }
            localStorage.otherback = '';
            
            if ($back == '#listapassageirosdogrupo') { $newback = '#grupomenu'; }
            else if ($back == '#grupomenu') { $newback = '#grupos'; }
            else if ($back == '#grupos') { $newback = '#principal'; }
            else if ($back == '#quartos') { $newback = '#grupomenu'; }
            else if ($back == '#opcionais') { $newback = '#grupomenu'; }
            else if ($back == '#pedidos') { $newback = '#opcionais'; }
            localStorage.setItem('backhistory', $newback);
            app.changePage($back);
        });

        $(document).on('click', '.scanpax', function() {
            app.setMainBackHistory();
            scan();
        });

        $(document).on('click', '.scandinamico', function() {
            localStorage.setItem('backhistory', "#pedidos");
            localStorage.setItem('refreshscan', true);
            app.criaScanDinamico(localStorage.getItem('opcional'));
            app.changePage('#contarporscan');
        });

        $(document).on('click', '.contador', function() {
            app.setMainBackHistory();
            app.changePage('#contador');
        });

        $(document).on('click', '.principal', function() {
            var page = "";
            page = localStorage.getItem('user_or_admin') == "user" ? "#grupomenu" : "#principal";
            app.changePage(page);
        });

        $(document).on('click', '.cadastropulseiras', function() {
            if ((localStorage.getItem('gp') == null) || (localStorage.getItem('gp') == ("nenhum")) ) {
                alert('Deve haver um grupo principal selecionado.');
            } else {
                app.criaListaPulseiras(localStorage.getItem('gp'));
                app.setMainBackHistory();
                app.changePage('#cadastropulseiras');
            }
        });

        $("#configGP").on( "change", function(event, ui) {
          localStorage.setItem('gp', $(this).val());
        });

        $("#atualizaserver").on( "click", function(event, ui) {
          localStorage.setItem('server', $('#servidor').val());
          $servidor = $('#servidor').val();
          alert('ok!');
        });

        //// Search Lateral
        // Busca Passageiro
        $(document).on('click', '#buscapassageiro', function() {
            app.buscaPassageiro($('input[name="paxabuscar"]').val(), "buscapax");
        });

        //Opcionais

        // Ver Opcional
        $(document).on('click', '.opcionalselecionado', function() {
            var $this = $(this);
            localStorage.setItem('backhistory', "#opcionais");
            app.mostraPedidos($(this).data('grupo-id'), $(this).data('id'), $(this).data('titulo'));
        });

        //Cadastra scan link
        $(document).on('click', '.cadastrascanlink', function() {
            localStorage.setItem('cliente_scan_id', $(this).data('id'));
            scancadastro();
        });

        //Envia ids das pulseiras
        $(document).on('click', '.enviapulseira', function() {
            console.log('enviandopulseira');
            app.enviaPulseira();
        });

        // Recebe ids das pulseiras
        $(document).on('click', '.buscapulseira', function() {
            console.log('recebendopulseira');
            app.recebePulseira();
        });

        // Recebe ids das pulseiras
        $(document).on('click', '.refreshscan', function() {
            $('#listcontarporscan').find('[data-id]').show();
            $('#scaneados').html(0);
            $('#scantotal').html($('#listcontarporscan').find('[data-id]').length);
        });

        $(document).on('click', '.deposita', function() {
            console.log($('#babecalho').data('id'));
            deposita($('#babecalho').data('id'));
        });

        $(document).on('click', '.saca', function() {
            saca($('#babecalho').data('id'));
            console.log($('#babecalho').data('id'));
        });

        $(document).on('click', '.abrepopdeletasaque', function() {
            localStorage.saqueadeletar = $(this).data('id');
            $('#popupDialog').popup("open", {
                "transition": "pop"
            });
        });

        $(document).on('click', '.apagasaque', function() {
            apagasaque(localStorage.saqueadeletar, $('#babecalho').data('id'));
        });

        
    },

    enviaPulseira: function() {
        var buttonIndex = 1;
        if (buttonIndex == 1) {
            database.retrievePulseiras(function(pulseiras) {
                $.ajax({
                    type : 'POST',
                    url : $servidor + '/pulseiras.json',
                    data : {
                        auth_token : localStorage.getItem('auth_token'),
                        tipo : localStorage.getItem('user_or_admin'),
                        grupo : localStorage.getItem('gp'),
                        pulseiras : pulseiras
                    }
                }).success(function jsSuccess(data, textStatus, jqXHR){
                    alert(data.info);
                    
                }).error(function jsError(jqXHR, textStatus, errorThrown){
                    
                    console.log(jqXHR);
                    console.log(textStatus);
                    console.log(errorThrown);
                });
            });
        }
    },

    recebePulseira: function() {
        var buttonIndex = 1;
        if (buttonIndex == 1) {
                $.ajax({
                    type : 'GET',
                    url : $servidor + '/pulseiras.json',
                    data : {
                        auth_token : localStorage.getItem('auth_token'),
                        tipo : localStorage.getItem('user_or_admin'),
                        grupo : localStorage.getItem('gp')
                    }
                }).success(function jsSuccess(data, textStatus, jqXHR){
                    $.each(data.data, function(i,item) {
                        database.db.transaction(
                        function(tx) {
                            query = "UPDATE clientes SET scanid='"+item.scanid+"' WHERE id="+item.id+"; ";
                            tx.executeSql(query);
                        },
                            database.txErrorHandler
                        );

                    });
                    $('.cadastropulseiras').trigger("click");
                    app.criaContaScan(localStorage.gp);
                    alert('Atualizado com sucesso');
                    
                    
                }).error(function jsError(jqXHR, textStatus, errorThrown){
                    
                    console.log(jqXHR);
                    console.log(textStatus);
                    console.log(errorThrown);
                });
           
        }
    },

    selecionaGrupo: function(id) {
        app.montaMenuGrupo(id);
        app.criaListaPassageiros(id);
        app.carregaInfoGrupos(id, "quartos", "#quartos-template", "#quartos");
        app.carregaInfoGrupos(id, "daybydays", "#daybyday-template", "#daybyday");
        app.carregaInfoGrupos(id, "bloqueios", "#bloqueios-template", "#bloqueios");
        app.criaOpcionais(id);
        app.criaContaScan(id);

        localStorage.setItem('backhistory', '#grupos');
        app.changePage('#grupomenu');
    },

    retrieveTemporadas: function() {
        $.ajax({
            async: false,
            type : 'GET',
            url : $servidor + '/temporadas_ativas.json',
            data : {
                auth_token : localStorage.getItem('auth_token'),
                tipo : localStorage.getItem('user_or_admin')
            }
        }).success(function jsSuccess(data, textStatus, jqXHR){
            $.mobile.loading( "hide" );
            console.log(data);
            $.each(data.data.temporadas, function(index,item) {
                $('#temporada-select')
                  .append($('<option>', { value : item.id })
                  .text(item.nome));
            });
            if (data.data.count == 1){
                alert('Você conectou com sucesso! Aguarde enquanto sincronizamos os dados.');
                if (localStorage.getItem('user_or_admin') == "user") {
                     localStorage.setItem('gp', data.data.temporadas[0].grupo_guia);
                     app.mobileLoading();
                }
                app.sincroniza(data.data.temporadas[0].id);
               
            } else {
                app.changePage('#temporadas');
            }
        }).error(function jsError(jqXHR, textStatus, errorThrown){
            
            console.log(jqXHR);
            console.log(textStatus);
            console.log(errorThrown);
        });

    },

    criaListaGrupos: function() {
        database.retrieveGrupos(function(grupos) {
            var source   = $("#grupos-template").html();
            var template = Handlebars.compile(source);
            grupos = {'grupos' : grupos };
            var html = template(grupos);
            $("#grupos #articleHandlebars").html(html);   
            $("#grupos #listview-content").trigger('create');  
            $("#grupos #listview-page").trigger('pagecreate');
            $("#grupos #articleHandlebars ul").listview('refresh');
            $("#grupos #articleHandlebars ul").listview().listview('refresh');
            
        });        
    },

    criaListaPassageiros: function(grupo) {
        database.retrievePassageiros(grupo, function(passageiros) {
            var source   = $("#passageiros-template").html();
            var template = Handlebars.compile(source);
            passageiros = {'passageiros' : passageiros };
            var html = template(passageiros);
            $("#listapassageirosdogrupo #articleHandlebars").html(html);   
            $("#listapassageirosdogrupo #listview-content").trigger('create');  
            $("#listapassageirosdogrupo #listview-page").trigger('pagecreate');
            $("#listapassageirosdogrupo #articleHandlebars ul").listview('refresh');
            $("#listapassageirosdogrupo #articleHandlebars ul").listview().listview('refresh');
            
        });        
    },

    criaContaListaPassageiros: function(grupo) {
        database.retrievePassageiros(grupo, function(passageiros) {
            var source   = $("#contarporlista-template").html();
            var template = Handlebars.compile(source);
            passageiros = {'passageiros' : passageiros };
            var html = template(passageiros);
            $("#contarporlista #articleHandlebars").html(html);   
            $("#contarporlista #listview-content").trigger('create');  
            $("#contarporlista #listview-page").trigger('pagecreate');
            $("#contarporlista #articleHandlebars ul").listview('refresh');
            $("#contarporlista #articleHandlebars ul").listview().listview('refresh');
            
        });        
    },

    criaListaPulseiras: function(grupo) {
        database.retrievePassageiros(grupo, function(passageiros) {
            var source   = $("#cadastropulseiras-template").html();
            var template = Handlebars.compile(source);
            passageiros = {'passageiros' : passageiros };
            var html = template(passageiros);
            $("#cadastropulseiras #articleHandlebars").html(html);   
            $("#cadastropulseiras #listview-content").trigger('create');  
            $("#cadastropulseiras #listview-page").trigger('pagecreate');
            $("#cadastropulseiras #articleHandlebars ul").listview('refresh');
            $("#cadastropulseiras #articleHandlebars ul").listview().listview('refresh');
            
        });        
    },

    criaContaScan: function(grupo) {
        database.retrievePassageiros(grupo, function(passageiros) {
            var source   = $("#contarporscan-template").html();
            var template = Handlebars.compile(source);
            passageiros = {'passageiros' : passageiros };
            console.log(passageiros);
            $('#scantotal').text(passageiros.passageiros.length);
            $('#scaneados').text(0);
            var html = template(passageiros);            
            $("#contarporscan #articleHandlebars").html(html);   
            $("#contarporscan #listview-content").trigger('create');  
            $("#contarporscan #listview-page").trigger('pagecreate');
            $("#contarporscan #articleHandlebars ul").listview('refresh');
            $("#contarporscan #articleHandlebars ul").listview().listview('refresh');

            
        });        
    },

    criaScanDinamico: function(opcional) {
        console.log('passo 2 - chegou');
         database.retrieveOpcionais('', opcional, "dinamico", function(passageiros) {
            var source   = $("#contarporscan-template").html();
            var template = Handlebars.compile(source);
            passageiros = {'passageiros' : passageiros };
            $('#scantotal').text(passageiros.passageiros.length);
            $('#scaneados').text(0);
            var html = template(passageiros);            
            $("#contarporscan #articleHandlebars").html(html);   
            $("#contarporscan #listview-content").trigger('create');  
            $("#contarporscan #listview-page").trigger('pagecreate');
            $("#contarporscan #articleHandlebars ul").listview('refresh');
            $("#contarporscan #articleHandlebars ul").listview().listview('refresh');

            
        });        
    },

    criaOpcionais: function(grupo) {
        database.retrieveOpcionais(grupo, "", "opcionais", function(opcionais) {
            var source   = $("#opcionaisgrupo-template").html();
            var template = Handlebars.compile(source);
            opcionais = {'opcionais' : opcionais };
            var html = template(opcionais);  
            $("#opcionais #articleHandlebars").html(html);
            $("#opcionais #listview-content").trigger('create');
            $("#opcionais #listview-page").trigger('pagecreate');
            $("#opcionais #articleHandlebars ul").listview('refresh');
            $("#opcionais #articleHandlebars ul").listview().listview('refresh');
            $('#opcionais').find('[data-grupo-id]').each(function() {
                $(this).attr('data-grupo-id', grupo);
            });

            
        });        
    },   

    montaMenuGrupo: function(grupo) {
        database.retrieveForGruposJson(grupo, "grupos", function(grupo) {
            var source   = $("#menugrupos-template").html();
            var template = Handlebars.compile(source);
            var html = template(grupo);
            $('.nomegrupo').text(grupo.nome);
            $("#grupomenu #articleHandlebars").html(html);   
            $("#grupomenu #listview-content").trigger('create');  
            $("#grupomenu #listview-page").trigger('pagecreate');
            $("#grupomenu #articleHandlebars ul").listview('refresh');
            $("#grupomenu #articleHandlebars ul").listview().listview('refresh');
            
        });        
    },

    mostraPassageiro: function(paxid,backhistory) {
        database.retrievePassageiro(paxid, function(passageiro) {
            var historyid = localStorage.backhistory;
            if (passageiro == "inexistente") {
                alert('passageiro inexistente');
                
            }
            else {
                var source   = $("#detalhepax-template").html();
                var template = Handlebars.compile(source);
                var html = template(passageiro);           
                $("#passageiro-view #articleHandlebars").html(html);

                // Carrego as outras infos... não achei modo mais esperto
                //app.carregaResumoFicha(passageiro.id);
                app.carregaInfoPax(paxid, "banquinho", "#banquinhoresumo-template", "#articleHandlebarsBanquinho");
                app.carregaInfoPax(paxid, "resumo_medico", "#resumoficha-template", "#articleHandlebarsFicha");          
                app.carregaInfoPax(paxid, "responsaveis", "#responsaveis-template", "#articleHandlebarsResponsaveis");
                app.carregaInfoPax(paxid, "contatos", "#contatos-template", "#articleHandlebarsContatos");
                app.carregaInfoPax(paxid, "enderecos", "#enderecos-template", "#articleHandlebarsEnderecos");
                app.carregaInfoPax(paxid, "opcionais", "#opcionais-template", "#articleHandlebarsOpcionais");
          
                localStorage.setItem('backhistory', '#listapassageirosdogrupo');
                if (backhistory) {
                    localStorage.setItem('backhistory', backhistory);
                }
                if (historyid != "#passageiro-view") {
                    app.changePage('#passageiro-view');
                }
            }        
        });        
    },

    abreBanquinho: function(paxid) {
        console.log('abrebanquinho');
        database.retrievePassageiro(paxid, function(passageiro) {
            if (passageiro == "inexistente") {
                alert('passageiro inexistente');
            }
            else {
                var source   = $("#detalhebanquinho-template").html();
                var template = Handlebars.compile(source);
                var html = template(passageiro);
                $("#banquinho-view #articleHandlebars").html(html);

                app.carregaBanquinhoPax(paxid, "banquinho", "#banquinho-template", "#articleHandlebarsBanquinho");          
                app.carregaBanquinhoPax(paxid, "saques", "#saques-template", "#articleHandlebarsSaque");
                // app.carregaInfoPax(paxid, "contatos", "#contatos-template", "#articleHandlebarsContatos");
                // app.carregaInfoPax(paxid, "enderecos", "#enderecos-template", "#articleHandlebarsEnderecos");
                // app.carregaInfoPax(paxid, "opcionais", "#opcionais-template", "#articleHandlebarsOpcionais");
          
                localStorage.setItem('backhistory', '#passageiro-view');
                app.changePage('#banquinho-view');
            }
        });
    },

    mostraPedidos: function(grupo, opcional,titulo) {
        $('#pedidos .header-title').html(titulo);
        $('#pedidos .titulo').html(titulo);
        localStorage.setItem('opcional', opcional);
        database.retrieveOpcionais(grupo, opcional, "pedidos", function(pedidos) {            
            var source   = $("#pedidos-template").html();
            var template = Handlebars.compile(source);
            pedidos = {'pedidos' : pedidos };
            var html = template(pedidos);           
            $("#pedidos #articleHandlebars").html(html);   
            $("#pedidos #listview-content").trigger('create');  
            $("#pedidos #listview-page").trigger('pagecreate');
            $("#pedidos #articleHandlebars ul").listview('refresh');
            $("#pedidos #articleHandlebars ul").listview().listview('refresh');

            app.changePage('#pedidos');
                    
        });        
    },

    // Carregam as infos para serem mostradas no menu de grupos
    // grupo = ID do grupo
    // db = qual banco de dados vai buscar infos que batam com o ID
    // hbtemplate = qual o template do handlebars deve ser utilizado
    // wrapper = onde o template do handlebars deve ser jogado    

    carregaInfoGrupos: function(grupo, db, hbtemplate, wrapper) {
        database.retrieveForGruposJson(grupo, db, function(resposta) {
            var source   = $(hbtemplate).html();
            var template = Handlebars.compile(source);
            resposta[db] = JSON.parse(resposta.jsonData);
            var html = template(resposta);

            $(wrapper.toString() + " #articleHandlebars").html(html);   
            $(wrapper.toString() + " #listview-content").trigger('create');  
            $(wrapper.toString() + " #listview-page").trigger('pagecreate');            
            $(wrapper.toString() + " #articleHandlebars ul").listview().listview('refresh');
            
        });        
    },

       
    // Carregam as infos para serem mostradas na tela do passageiro
    // passageiro = ID do passageiro
    // db = qual banco de dados vai buscar infos que batam com o ID
    // hbtemplate = qual o template do handlebars deve ser utilizado
    // wrapper = onde o template do handlebars deve ser jogado

    carregaInfoPax: function(passageiro, db, hbtemplate, wrapper ) {
        database.retrieveForPax(passageiro, db, function(resposta) {
            var source   = $(hbtemplate).html();
            var template = Handlebars.compile(source);
            resposta[db] = resposta;
            var html = template(resposta);

            $("#passageiro-view "+wrapper.toString()).html(html);   
            $("#passageiro-view #listview-content").trigger('create');  
            $("#passageiro-view #listview-page").trigger('pagecreate');
            $("#passageiro-view "+wrapper.toString()+" ul").listview('refresh');
            $("#passageiro-view "+wrapper.toString()+" ul").listview().listview('refresh');

            if (db == "resumo_medico") {
                $('#passageiro-view .ui-body-inherit').each(function() {
                    if ($(this).text() == "true") { $(this).replaceWith('<li class="ui-li ui-li-static ui-btn-up-c ui-body-inherit ui-last-child">Sim/Yes</li>'); } 
                });
            }
            
        });        
    },

    carregaBanquinhoPax: function(passageiro, db, hbtemplate, wrapper ) {
        database.retrieveForPax(passageiro, db, function(resposta) {
            var source   = $(hbtemplate).html();
            var template = Handlebars.compile(source);
            resposta[db] = resposta;
            console.log(resposta);
            var html = template(resposta);

            $("#banquinho-view "+wrapper.toString()).html(html);   
            $("#banquinho-view #listview-content").trigger('create');  
            $("#banquinho-view #listview-page").trigger('pagecreate');
            $("#banquinho-view "+wrapper.toString()+" ul").listview('refresh');
            $("#banquinho-view "+wrapper.toString()+" ul").listview().listview('refresh');
            
        });        
    },

    buscaPassageiro: function(passageiro, db) {
        
        database.retrieveForPax(passageiro, "buscapax", function(resposta) {
            var source   = $("#buscapax-template").html();
            var template = Handlebars.compile(source);
            resposta[db] = resposta;
            var html = template(resposta);

            $("#sidesearch #articleHandlebars").html(html);   
            $("#sidesearch #listview-content").trigger('create');  
            $("#sidesearch #listview-page").trigger('pagecreate');
            $("#sidesearch #articleHandlebars ul").listview('refresh');
            $("#sidesearch #articleHandlebars ul").listview().listview('refresh');

        });        
    },

    criaGPConfig: function() {
        database.retrieveGrupos(function(grupos) {
            $.each(grupos, function(index,item) {
                $('#configGP')
                  .append($('<option>', { value : item.id })
                  .text(item.nome)); 
            });
            if (localStorage.getItem('gp')) {
                $('#configGP').val(localStorage.getItem('gp')).selectmenu('refresh');
            }
                
            
        });      
    }
};

var database = {
    initialize: function(callback) {
        var self = this;
        this.db = window.openDatabase("miviromobiledb", "1.0", "Database do Miviro Mobile", 200000);
        
    },

    createTables: function(callback) {
        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS grupos ( " +
                    "id INTEGER PRIMARY KEY, " +
                    "nome VARCHAR(50), " +
                    "retorno DATETIME, " +
                    "partida DATETIME)";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela Grupos criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS clientes ( " +
                    "id INTEGER PRIMARY KEY, " +
                    "cpf VARCHAR(15), " +
                    "data_nascimento DATE, " +
                    "email VARCHAR(80), " +
                    "n_passaporte VARCHAR(15), " +
                    "nome VARCHAR(50), " +
                    "observacoes VARCHAR(500), " +
                    "sexo CHARACTER(1), " +
                    "validade_passaporte DATE, " +
                    "grupo_id INTEGER, " +
                    "scanid VARCHAR(500))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela Clientes criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS resumo_medico ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "cliente_id INTEGER, " +
                    "titulo VARCHAR(30), " +
                    "descricao VARCHAR(500))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela Resumo Médico criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS responsaveis ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "cliente_id INTEGER, " +
                    "nome VARCHAR(50))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela responsaveis criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS daybydays ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "grupo_id INTEGER, " +
                    "jsonData NVARCHAR(10000))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela daybydays criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS quartos ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "grupo_id INTEGER, " +
                    "jsonData NVARCHAR(10000))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela quartos criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS bloqueios ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "grupo_id INTEGER, " +
                    "jsonData NVARCHAR(10000))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela bloqueios criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS enderecos ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "cliente_id INTEGER, " +
                    "endereco VARCHAR(200))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela endereços criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS contatos ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "cliente_id INTEGER, " +
                    "de_quem VARCHAR(15), " +
                    "tipo VARCHAR(25), " +
                    "valor VARCHAR(50))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela contatos criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS opcionais ( " +
                    "id INTEGER PRIMARY KEY, " +
                    "grupo_id INTEGER, " +
                    "titulo VARCHAR(50), " +
                    "preco INTEGER, " +
                    "moeda VARCHAR(5))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela opcionais criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS pedidos ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "grupo_id INTEGER, " +
                    "cliente_id INTEGER, " +
                    "opcional_id INTEGER, " +
                    "situacao INTEGER)";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela pedidos criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS saques ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "data DATE, " +
                    "cliente_id INTEGER, " +
                    "valor INTEGER)";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela pedidos criada com sucesso');
            }
        );

        this.db.transaction(
            function(tx) {
                var sql =
                    "CREATE TABLE IF NOT EXISTS banquinho ( " +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "deposito INTEGER, " +
                    "cliente_id INTEGER, " +
                    "saldo INTEGER, " +
                    "envelope VARCHAR(5), " +
                    "UNIQUE(cliente_id))";
                tx.executeSql(sql);
            },
            this.txErrorHandler,
            function() {
                console.log('Tabela pedidos criada com sucesso');
            }
        );


    },

    txErrorHandler: function(tx) {
        alert(tx.message);
    },

    importa: function(data) {
        var $this = this;

        console.log('Chegou na função de importar / Got the the import function'); 
        this.db.transaction(
            function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS grupos');
                tx.executeSql('DROP TABLE IF EXISTS clientes');
                tx.executeSql('DROP TABLE IF EXISTS resumo_medico');
                tx.executeSql('DROP TABLE IF EXISTS responsaveis');
                tx.executeSql('DROP TABLE IF EXISTS daybydays');
                tx.executeSql('DROP TABLE IF EXISTS quartos');
                tx.executeSql('DROP TABLE IF EXISTS bloqueios');
                tx.executeSql('DROP TABLE IF EXISTS contatos');
                tx.executeSql('DROP TABLE IF EXISTS enderecos');
                tx.executeSql('DROP TABLE IF EXISTS opcionais');
                tx.executeSql('DROP TABLE IF EXISTS pedidos');
            }
        );
        database.createTables();

        console.log('Importando Grupos / Importing Grupos');
        var grupos = data.data.grupos;
        this.db.transaction(
            function(tx) {                
                var l = grupos.length;
                var sql =
                    "INSERT OR REPLACE INTO grupos (id, nome, retorno, partida) " +
                    "VALUES (?, ?, ?, ?)";
                var e;
                for (var i = 0; i < l; i++) {
                    e = grupos[i];
                    var params = [e.id, e.nome, e.retorno, e.partida];
                    tx.executeSql(sql, params);
                }
                console.log('GRUPOS: Sincronização completa (' + l + ' grupos adicionados)');
            },
            this.txErrorHandler
        );

        console.log('Importando Clientes / Importing Clientes');        

        var clientes_por_grupo = data.data.clientes;
        
        this.db.transaction(
            function(tx) {
                $.each(clientes_por_grupo, function(grupo,clientes) {
                var l = clientes.length;
                var sql =
                    "INSERT OR REPLACE INTO clientes (id, cpf, data_nascimento, email, n_passaporte, nome, observacoes, sexo, validade_passaporte, grupo_id, scanid) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                var e;
                for (var i = 0; i < l; i++) {
                    e = clientes[i];
                    var params = [e.id, e.cpf, e.data_nascimento, e.email, e.n_passaporte, e.nome_passaporte, e.observacoes, e.sexo, e.validade_passaporte, grupo, ""];
                    tx.executeSql(sql, params);
                }
                });
               },
            this.txErrorHandler
        );

        this.db.transaction(
            function(tx) {
                $.each(clientes_por_grupo, function(grupo,clientes) {
                var l = clientes.length;
                var sql =
                    "INSERT OR IGNORE INTO banquinho (deposito, cliente_id, saldo) " +
                    "VALUES (?, ?, ?)";
                var e;
                for (var i = 0; i < l; i++) {
                    e = clientes[i];
                    var params = [0, e.id, 0];
                    tx.executeSql(sql, params);
                }
                });
               },
            this.txErrorHandler
        );
        

        var fichamedica_por_cliente = data.data.fichas_medicas;
        
        this.db.transaction(
            function(tx) {
                $.each(fichamedica_por_cliente, function(cliente,resumo) {
                    $.each(resumo, function(titulo,descricao) {
                        var sql =
                            "INSERT OR REPLACE INTO resumo_medico (cliente_id, titulo, descricao) " +
                            "VALUES (?, ?, ?)";
                        var params = [cliente, titulo, descricao];
                        tx.executeSql(sql, params);
                    });
                });                    
            },
            this.txErrorHandler
        );
            

        console.log('Importando Responsáveis / Importing Responsáveis');
        var responsaveis_por_cliente = data.data.responsaveis;

        this.db.transaction(
            function(tx) {
                $.each(responsaveis_por_cliente, function(cliente,responsaveis) {                 
                    var l = responsaveis.length;
                    var sql =
                        "INSERT OR REPLACE INTO responsaveis (cliente_id, nome) " +
                        "VALUES (?, ?)";
                    $.each(responsaveis, function (a,b) {
                        var params = [cliente, b.nome_passaporte];
                        tx.executeSql(sql, params);
                    });                      
                        
                });
            },
            this.txErrorHandler
        );

        console.log('Importando Endereços / Importing Endereços');
        var enderecos_por_cliente = data.data.enderecos;

        this.db.transaction(
            function(tx) {
                $.each(enderecos_por_cliente, function(cliente,enderecos) {                 
                    var l = enderecos.length;
                    var sql =
                        "INSERT OR REPLACE INTO enderecos (cliente_id, endereco) " +
                        "VALUES (?, ?)";
                    $.each(enderecos, function (a,b) {
                        var params = [cliente, b];
                        tx.executeSql(sql, params);
                    });                      
                        
                });
            },
            this.txErrorHandler
        );

        console.log('Importando Contatos / Importing Contatos');
        var contatos_por_cliente = data.data.contatos;

        this.db.transaction(
            function(tx) {
                $.each(contatos_por_cliente, function(cliente,contatos) {                 
                    var l = contatos.length;
                    var sql =
                        "INSERT OR REPLACE INTO contatos (cliente_id, de_quem, tipo, valor) " +
                        "VALUES (?, ?, ?, ?)";
                    $.each(contatos, function (a,b) {
                        var params = [cliente, b.de_quem, b.tipo, b.valor];
                        tx.executeSql(sql, params);
                    });                      
                        
                });
            },
            this.txErrorHandler
        );

        console.log('Importando Opcionais / Importing Opcionais');
        var opcionais_por_grupo = data.data.opcionais;
        console.log(opcionais_por_grupo);

        this.db.transaction(
            function(tx) {
                $.each(opcionais_por_grupo, function(grupo,opcionais) {
                console.log(grupo);               
                    var sql =
                        "INSERT OR REPLACE INTO opcionais (id, grupo_id, titulo, preco, moeda) " +
                        "VALUES (?, ?, ?, ?, ?)";
                    $.each(opcionais, function (a,b) {
                        console.log(sql);
                        var params = [b.id, grupo, b.titulo, b.preco, b.moeda];
                        console.log(params);
                        tx.executeSql(sql, params);
                    });                      
                        
                });
            },
            this.txErrorHandler
        );

        console.log('Importando Pedidos / Importing Pedidos');
        var pedidos_por_grupo = data.data.pedidos;

        this.db.transaction(
            function(tx) {
                $.each(pedidos_por_grupo, function(grupo,pedidos) {                 
                    var sql =
                        "INSERT OR REPLACE INTO pedidos (grupo_id, cliente_id, opcional_id, situacao) " +
                        "VALUES (?, ?, ?, ?)";
                    $.each(pedidos, function (a,b) {
                        var params = [grupo, b.cliente_id, b.produto_id, b.situacao];
                        tx.executeSql(sql, params);
                    });                      
                        
                });
            },
            this.txErrorHandler
        );
        

        console.log('Importando Day by Day / Importing Day by Day');
        var daybyday_por_grupo = data.data.daybyday;
        
        this.db.transaction(
            function(tx) {
                $.each(daybyday_por_grupo, function(grupo,jsonData) {
                    var l = grupo.length;
                    var sql =
                        "INSERT OR REPLACE INTO daybydays (grupo_id, jsonData) " +
                        "VALUES (?, ?)";
                    var e;
                    for (var i = 0; i < l; i++) {
                        var params = [grupo, JSON.stringify(jsonData)];
                        tx.executeSql(sql, params);
                    }
                });
            },
            this.txErrorHandler
        );
        

        console.log('Importando Quartos / Importing Quartos');
        var quartos_por_grupo = data.data.quartos;
        
        this.db.transaction(
            function(tx) {
                $.each(quartos_por_grupo, function(grupo,jsonData) {
                    var l = grupo.length;
                    var sql =
                        "INSERT OR REPLACE INTO quartos (grupo_id, jsonData) " +
                        "VALUES (?, ?)";
                    console.log('Inserindo ou atualizendo no banco de dados local:');
                    var e;
                    console.log(jsonData);
                    for (var i = 0; i < l; i++) {
                        var params = [grupo, JSON.stringify(jsonData)];
                        tx.executeSql(sql, params);
                    }
                });
            },
            this.txErrorHandler
        );

        console.log('Importando Vôos / Importing Vôos');
        var bloqueios_por_grupo = data.data.bloqueios;
        
        this.db.transaction(
            function(tx) {
                $.each(bloqueios_por_grupo, function(grupo,jsonData) {
                    var l = grupo.length;
                    var sql =
                        "INSERT OR REPLACE INTO bloqueios (grupo_id, jsonData) " +
                        "VALUES (?, ?)";
                    var e;
                    for (var i = 0; i < l; i++) {
                        var params = [grupo, JSON.stringify(jsonData)];
                        tx.executeSql(sql, params);
                    }
                });
            },
            this.txErrorHandler
        );
        
    },

    retrieveGrupos: function(callback) {
        this.db.transaction(
            function(tx) {
                var sql = "SELECT * FROM grupos";
                tx.executeSql(sql, this.txErrorHandler,
                    function(tx, results) {
                        var len = results.rows.length,
                            grupos = [],
                            i = 0;
                        for (; i < len; i = i + 1) {
                            grupos[i] = results.rows.item(i);
                        }
                        callback(grupos);
                    }
                );
            }
        );   
    },

    retrievePassageiros: function(grupo,callback) {
        this.db.transaction(
            function(tx) {
                var sql = " SELECT * FROM `clientes` WHERE `grupo_id` LIKE '"+grupo+"' ORDER BY `nome` ASC";
                tx.executeSql(sql, this.txErrorHandler,
                    function(tx, results) {
                        var len = results.rows.length,
                            passageiros = [],
                            i = 0;
                        for (; i < len; i = i + 1) {
                            passageiros[i] = results.rows.item(i);
                        }
                        callback(passageiros);
                    }
                );
            }
        );   
    },

    retrieveOpcionais: function(grupo, opcional, tipo, callback) {
        this.db.transaction(
            function(tx) {
                var sql = " SELECT * FROM opcionais WHERE grupo_id LIKE "+grupo+" ORDER BY titulo ASC";
                if (tipo == "pedidos") {
                    var sql = "SELECT pedidos.situacao, clientes.nome, clientes.id FROM pedidos INNER JOIN clientes ON pedidos.cliente_id = clientes.id WHERE pedidos.opcional_id LIKE '"+opcional+"' AND pedidos.grupo_id LIKE '"+grupo+"' ORDER BY pedidos.situacao DESC";
                }
                if (tipo == "dinamico") {
                    var sql = "SELECT pedidos.situacao, clientes.nome, clientes.id, clientes.scanid FROM pedidos INNER JOIN clientes ON pedidos.cliente_id = clientes.id WHERE pedidos.opcional_id LIKE '"+opcional+"' AND pedidos.situacao LIKE 1 ORDER BY clientes.nome ASC";
                }
                tx.executeSql(sql, this.txErrorHandler,
                    function(tx, results) {
                        var len = results.rows.length,
                            passageiros = [],
                            i = 0;
                        for (; i < len; i = i + 1) {
                            passageiros[i] = results.rows.item(i);
                        }
                        callback(passageiros);
                    }
                );
            }
        );   
    },

    retrievePassageiro: function(pax,callback) {
        this.db.transaction(
            function(tx) {
                var sql = "SELECT c.id, c.nome, c.data_nascimento, c.n_passaporte, c.cpf, grupos.nome AS gruponome FROM `clientes` AS c INNER JOIN grupos ON c.grupo_id = grupos.id WHERE c.id LIKE '"+pax+"';";
                tx.executeSql(sql, this.txErrorHandler,
                    function(tx, results) {
                        if (results.rows.length > 0) {
                            passageiro = results.rows.item(0);
                        }
                        else {
                            passageiro = "inexistente";
                        }
                        callback(passageiro);
                    }
                );
            }
        );   
    },

           
    retrieveForPax: function(pax, db, callback) {
        this.db.transaction(
            function(tx) {                
                var sql = " SELECT * FROM "+db+" WHERE cliente_id LIKE "+pax+"";
                if (db == "opcionais"){
                    var sql = " SELECT pedidos.situacao, opcionais.titulo FROM 'pedidos' INNER JOIN 'clientes' on pedidos.cliente_id = clientes.id INNER JOIN 'opcionais' ON pedidos.opcional_id = opcionais.id WHERE `cliente_id` LIKE '"+pax+"' ORDER BY pedidos.situacao DESC";
                }
                if (db == "buscapax"){
                    var sql = " SELECT * FROM clientes WHERE nome LIKE '%"+pax+"%' ";
                }
                tx.executeSql(sql, this.txErrorHandler,
                    function(tx, results) {
                        var len = results.rows.length,
                            resultado = [],
                            i = 0;
                        for (; i < len; i = i + 1) {
                            resultado[i] = results.rows.item(i);
                        }
                        callback(resultado);
                    }
                );
            }
        );   
    },


    retrieveForGruposJson: function(grupo, db, callback) {
        var $campo = "grupo_id";
        if (db == "grupos") { $campo = "id"; }
        this.db.transaction(
            function(tx) {
                var sql = "SELECT * FROM '"+db+"' WHERE 1=1 AND `"+$campo+"` LIKE '"+grupo+"' ORDER BY `rowid` ASC LIMIT 1;";
                    tx.executeSql(sql, this.txErrorHandler,
                    function(tx, results) {
                        resultado = results.rows.item(0);
                        callback(resultado);
                    }
                );
            }
        );   
    },

    retrievePulseiras: function(callback) {
        var grupo = localStorage.getItem('gp');
        this.db.transaction(
            function(tx) {
                var sql = " SELECT id, scanid FROM `clientes` WHERE `grupo_id` LIKE '"+grupo+"' AND NOT `scanid` = '';";
                tx.executeSql(sql, this.txErrorHandler,
                    function(tx, results) {
                        
                       var len = results.rows.length,
                            pulseiras = [],
                            i = 0;
                        for (; i < len; i = i + 1) {
                            pulseiras[i] = results.rows.item(i);
                        }
                        callback(pulseiras);

                    }
                );
            }
        );   
    }
};

function success(resultArray) {

    database.db.transaction(function(tx) {
            query = "SELECT * FROM clientes WHERE 1=1 AND scanid LIKE '"+resultArray[0]+"'  ORDER BY id ASC LIMIT 0, 50000;";
            tx.executeSql(query, [], function(tx, results){
                app.setMainBackHistory();
                if (results.rows.length > 0) {
                    app.mostraPassageiro(results.rows.item(0).id);    
                } else {
                    cliente = resultArray[0].split("|");
                    passageiro = cliente[1];
                    app.mostraPassageiro(cliente[1]);                
                }
            }, null);      
         
        },
        database.txErrorHandler
    );


}

function failure(error) {

}

function scan() {
    // See below for all available options.
    cordova.exec(success, failure, "ScanditSDK", "scan",
                 ["T9wvdOtuEeOd16y4en1qM7Gex2FyAInOBBaHuIEVu1o",
                  {"beep": true,
                  "1DScanning" : true,
                  "2DScanning" : true}]);
}


$('#target').tap(function() {
            $('#output').html(function(i, val) { return val*1+1 });
        });

        $('#reset').tap(function() {
            $('#output').html(0);
});


$(document).on('click', '#contarscanbutton', function() {
    scan2();
});

function success2(resultArray) {
    cliente = resultArray[0].split("|");
    passageiroid = cliente[1];
    if ($('#listcontarporscan').find("[data-id = '"+passageiroid+"']:visible").length > 0) {
        $('#listcontarporscan').find("[data-id = '"+passageiroid+"']").hide();
        $('#scaneados').html(function(i, val) { return val*1+1 });
        $('#scantotal').html(function(i, val) { return val*1-1 });
    }
    if ($('#listcontarporscan').find("[data-scan-id = '"+resultArray[0]+"']:visible").length > 0) {
        $('#listcontarporscan').find("[data-scan-id = '"+resultArray[0]+"']").hide();
        $('#scaneados').html(function(i, val) { return val*1+1 });
        $('#scantotal').html(function(i, val) { return val*1-1 });
    }

}

function scan2() {
    // See below for all available options.
    cordova.exec(success2, failure, "ScanditSDK", "scan",
                 ["T9wvdOtuEeOd16y4en1qM7Gex2FyAInOBBaHuIEVu1o",
                  {"beep": true,
                  "1DScanning" : true,
                  "2DScanning" : true}]);
}

function scancadastro() {
    // See below for all available options.
    cordova.exec(cadastrascan, failure, "ScanditSDK", "scan",
                 ["T9wvdOtuEeOd16y4en1qM7Gex2FyAInOBBaHuIEVu1o",
                  {"beep": true,
                  "1DScanning" : true,
                  "2DScanning" : true}]);
}

function cadastrascan(resultArray) {
    codigo = resultArray[0];

    database.db.transaction(
        function(tx) {
            query = "UPDATE clientes SET scanid='"+codigo+"' WHERE id="+localStorage.getItem('cliente_scan_id')+"; ";
            tx.executeSql(query)       
         
        },
        database.txErrorHandler
    );
    $('.cadastropulseiras').trigger("click");
    app.criaContaScan(localStorage.gp);
    alert('cadastrado com sucesso');   
}


function deposita(pax) {
    console.log(pax);
    valor = $('#adepositar:visible').val();
    envelope = $('#aenvelopar:visible').val();
    if (valor == "") {
        alert('Favor informar o valor');
        return false
    }
    database.db.transaction(
        function(tx) {
            query = "UPDATE banquinho SET deposito='"+valor+"', envelope='"+envelope+"' WHERE cliente_id="+pax+"; ";
            tx.executeSql(query)         
        },
        database.txErrorHandler
    );
    $('#totaldepositado').html(valor);
    $('#popupdeposito').popup( "close" );
    atualizasaldo(pax);
}

function saca(pax) {
    console.log(pax);
    valor = $('#asacar:visible').val();
    datasaque = new Date();
    
    if (valor == "") {
        alert('Favor informar o valor');
        return false
    }
    
    database.db.transaction(
        function(tx) {
            query = "INSERT INTO saques (data, cliente_id, valor) VALUES("+datasaque.getTime()+","+pax+","+valor+"); ";
            tx.executeSql(query);
        },
        database.txErrorHandler
    );
 $('#popupsaque').popup( "close" );
 atualizasaldo(pax);
}

function atualizasaldo(pax) {
    console.log(pax);
    deposito = parseInt($('#totaldepositado:visible').html());
    $saldototal = 0;
    database.db.transaction(function (tx) {
       tx.executeSql('SELECT * FROM saques WHERE cliente_id LIKE '+pax+';', [], function (tx, results) {
          var len = results.rows.length, i;
          $saldototal = 0;
          for (i = 0; i < len; i++){
            $saldototal = $saldototal + parseInt(results.rows.item(i).valor);
          }

          $saldototal = deposito - $saldototal;
          continuasaldo(pax,$saldototal)
       }, null);
    });   
}

function continuasaldo(pax, saldo) {

    database.db.transaction(
        function(tx) {
            query = "UPDATE banquinho SET saldo='"+saldo+"' WHERE cliente_id="+pax+"; ";
            tx.executeSql(query);
        },
        database.txErrorHandler
    );
    $('#popupsaque').popup( "close" );
    app.mostraPassageiro(pax);
    app.abreBanquinho(pax);
}

function apagasaque(saque, pax) {

    database.db.transaction(
        function(tx) {
            query = "DELETE FROM saques WHERE id='"+saque+"';";
            tx.executeSql(query);
        },
        database.txErrorHandler
    );
    $('#popupDialog').popup( "close" );
    atualizasaldo(pax);
}
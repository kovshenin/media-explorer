/*
Copyright © 2013 Code for the People Ltd

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

*/

var media = wp.media;

// VIEW: MEDIA ITEM:

media.view.EMMItem = Backbone.View.extend({

    tagName   : 'li',
    className : 'emm-item attachment',

    render: function() {

    	this.template = media.template( 'emm-' + this.options.service.id + '-item-' + this.options.tab );
       	this.$el.html( this.template( this.model.toJSON() ) );

        return this;

    }

});

// VIEW - BOTTOM TOOLBAR

media.view.Toolbar.EMM = media.view.Toolbar.extend({

	initialize: function() {

		_.defaults( this.options, {
		    event : 'inserter',
		    close : false,
			items : {
			    // See wp.media.view.Button
			    inserter     : {
			        id       : 'emm-button',
			        style    : 'primary',
			        text     : emm.labels.insert,
			        priority : 80,
			        click    : function() {
					    this.controller.state().emmInsert();
					}
			    }
			}
		});

		media.view.Toolbar.prototype.initialize.apply( this, arguments );

	},

	refresh: function() {

		var selected = this.controller.state().frame.content.get().model.get( 'selected' );

		this.get( 'inserter' ).model.set( 'disabled', !selected );

		media.view.Toolbar.prototype.refresh.apply( this, arguments );

	}

});

// VIEW - MEDIA CONTENT AREA

media.view.EMM = media.View.extend({

	events: {
		'click .emm-item-area'       : 'toggleSelectionHandler',
		'click .emm-item .check'     : 'removeSelectionHandler',
		'click .emm-pagination a'    : 'paginate',
			'change .emm-toolbar :input' : 'updateInput'
		},
	
		initialize: function() {

       	this.collection = new Backbone.Collection();
	    this.service = this.options.service;
	    this.tab = this.options.tab;

	    this.createToolbar();
		this.clearItems();

		if ( this.model.get( 'items' ) ) {

        	this.collection = new Backbone.Collection();
        	this.collection.reset( this.model.get( 'items' ) );

        }

	    // @TODO do this somewhere else:
	    // @TODO this gets reverted anyway when the button model's disabled state changes. look into it.
	    //jQuery( '#emm-button' ).text( this.service.labels.insert );

        this.collection.on( 'reset', this.render, this );

	    this.model.on( 'change:params', this.changedParams, this );

	    this.on( 'loading',       this.loading, this );
	    this.on( 'loaded',        this.loaded, this );
	    this.on( 'change:params', this.changedParams, this );
	    this.on( 'change:page',   this.changedPage, this );

	},
		
    render: function() {

        var that = this;

        if ( this.collection && this.collection.models.length ) {

	        this.clearItems();

	        var container = document.createDocumentFragment();

	        _.each( this.collection.models, function( model ) {
	        	container.appendChild( that.renderItem( model ) );
	        }, this );

	        this.$el.find( '.emm-items' ).append( container );

        }

    	if ( this.model.get( 'selected' ) )
    		jQuery( '#emm-button' ).prop( 'disabled', false );

		return this;

    },
 
    renderItem : function( model ) {
        var view = new media.view.EMMItem({
            model   : model,
            service : this.service,
            tab     : this.tab
        });
        return view.render().el;
    },
	
	createToolbar: function() {

		// @TODO this could be a separate view:
		html = '<div class="emm-error"></div>';
		this.$el.prepend( html );

		// @TODO this could be a separate view:
		html = '<div class="emm-empty"></div>';
		this.$el.prepend( html );

		// @TODO this could be a separate view:
        html = '<ul class="emm-items clearfix"></ul>';
		this.$el.append( html );

		// @TODO this could be a separate view:
		var toolbar_template = media.template( 'emm-' + this.service.id + '-search-' + this.tab );
		html = '<div class="emm-toolbar clearfix">' + toolbar_template( this.model.toJSON() ) + '</div>';
		this.$el.prepend( html );

		// @TODO this could be a separate view:
		html = '<div class="emm-pagination clearfix"><a href="#" class="button button-secondary button-large">' + this.service.labels.loadmore + '</a><div class="spinner"></div></div>';
		this.$el.append( html );

	},

	removeSelectionHandler: function( event ) {

		var target = jQuery( '#' + event.currentTarget.id );
		var id     = target.attr( 'data-id' );

		this.removeFromSelection( target, id );

		event.preventDefault();

	},
	
	toggleSelectionHandler: function( event ) {

		// @TODO don't trigger selection if the target is an anchor

		var selected = this.model.get( 'selected' ) || {};
		var target   = jQuery( '#' + event.currentTarget.id );
		var id       = target.attr( 'data-id' );

		if ( selected[id] )
			this.removeFromSelection( target, id );
		else
			this.addToSelection( target, id );

	},
	
	addToSelection: function( target, id ) {

		target.closest( '.emm-item' ).addClass( 'selected details' );

		selected = this.model.get( 'selected' ) || {};
		selected[id] = this.collection._byId[id];

		this.model.set( 'selected', selected );
		this.trigger( 'change:selected' );

	},
	
	removeFromSelection: function( target, id ) {

		target.closest( '.emm-item' ).removeClass( 'selected details' );

		selected = this.model.get( 'selected' ) || {};
		delete selected[id];

		if ( !_.size(selected) )
			selected = null;

		this.model.set( 'selected', selected );
		this.trigger( 'change:selected' );

	},
	
	clearSelection: function() {

		this.$el.find( '.emm-item' ).removeClass( 'selected details' );

		this.model.set( 'selected', null );

	},

	clearItems: function() {
		this.clearSelection();
		this.$el.find('.emm-items').empty();
		this.$el.find( '.emm-pagination' ).hide();
	},
	
	loading: function() {

		// show spinner
		this.$el.find( '.spinner' ).show();

		// hide messages
		this.$el.find( '.emm-error' ).hide().text('');
		this.$el.find( '.emm-empty' ).hide().text('');

	},

	loaded: function() {

		// hide spinner
		this.$el.find( '.spinner' ).hide();

	},

	fetchItems: function() {

		this.trigger( 'loading' );

		var data = {
			service : this.service.id,
			params  : this.model.get( 'params' ),
			page    : this.model.get( 'page' ),
			max_id  : this.model.get( 'max_id' )
		};

		media.ajax( 'emm_request', {
			context : this,
			success : this.fetchedSuccess,
			error   : this.fetchedError,
			data    : data
		} );

	},

	fetchedSuccess: function( response ) {

		if ( !this.model.get( 'page' ) ) {

			if ( !response.items ) {
				this.fetchedEmpty( response );
				return;
			}

			this.model.set( 'min_id', response.meta.min_id );
			this.model.set( 'items',  response.items );

			this.collection.reset( response.items );

		} else {

			if ( !response.items ) {
				this.moreEmpty( response );
				return;
			}

			this.model.set( 'items', this.model.get( 'items' ).concat( response.items ) );

			var collection = new Backbone.Collection( response.items );
			var that = this;

			this.collection.add( collection.models );

			var container = document.createDocumentFragment();

			_.each( collection.models, function( model ) {
				container.appendChild( that.renderItem( model ) );
			}, this );

			this.$el.find( '.emm-items' ).append( container );

		}

		this.$el.find( '.emm-pagination' ).show();

		this.model.set( 'max_id', response.meta.max_id );

		this.trigger( 'loaded loaded:success' );

	},

	fetchedEmpty: function( response ) {

		this.$el.find( '.emm-empty' ).text( this.service.labels.noresults ).show();

		this.$el.find( '.emm-pagination' ).hide();

		this.trigger( 'loaded loaded:noresults' );

	},

	fetchedError: function( response ) {

		this.$el.find( '.emm-error' ).text( response.error_message ).show();

		this.trigger( 'loaded loaded:error' );

	},

	updateInput: function( event ) {

		// triggered when a search input/filter is changed

	    //if ( !event.currentTarget.value ) // @TODO <- this might not be desired
	    //	return;

	    var params = this.model.get( 'params' );
	    var els = this.$el.find( '.emm-toolbar' ).find( ':input' ).each( function( k, el ) {
		    params[jQuery(this).attr('name')] = jQuery(this).val();
	    } );

	    this.model.set( 'params', params );
	    this.trigger( 'change:params' ); // why isn't this triggering automatically? might be because params is an object

	},
	
	paginate : function( event ) {

		var page = this.model.get( 'page' ) || 1;

		this.model.set( 'page', page + 1 );
	    this.trigger( 'change:page' );

	    event.preventDefault();

	},

	changedPage: function() {

		// triggered when the pagination is changed

		this.fetchItems();

	},

	changedParams: function() {

		// triggered when the search parameters are changed

	    this.model.set( 'selected', null );
		this.model.set( 'page',     null );
		this.model.set( 'min_id',   null );
		this.model.set( 'max_id',    null );

		this.clearItems();
		this.fetchItems();

	}

});

// VIEW - MEDIA FRAME (MENU BAR)	

var post_frame = media.view.MediaFrame.Post;

media.view.MediaFrame.Post = post_frame.extend({

    initialize: function() {

        var frame = this;

        post_frame.prototype.initialize.apply( this, arguments );
        
        _.each(emm.services, function( service, service_id ) {

        	var id = 'emm-service-' + service.id;
    		var controller = {
                id:       id,
                router:   id + '-router',
				toolbar:  id + '-toolbar',
                menu:     'default',
				title:    service.labels.title,
				tabs:     service.tabs,
				priority: 100 // places it above Insert From URL
            };

            for ( tab in service.tabs ) {

		        // Content
		        frame.on( 'content:render:' + id + '-content-' + tab, _.bind( frame.emmContentRender, frame, service, tab ) );

            	// Set the default tab
            	if ( service.tabs[tab].default )
	            	controller.content = id + '-content-' + tab;

            }

			frame.states.add([
	            new media.controller.EMM( controller )
	        ]);

			// Tabs
			frame.on( 'router:create:' + id + '-router', frame.createRouter, frame );
	        frame.on( 'router:render:' + id + '-router', _.bind( frame.emmRouterRender, frame, service ) );

	        // Toolbar
	        frame.on( 'toolbar:create:' + id + '-toolbar', frame.emmToolbarCreate, frame );

		});
        
    },

    emmRouterRender : function( service, view ) {

    	var id = 'emm-service-' + service.id;

        tabs = {};

        for ( tab in service.tabs ) {
        	tab_id = id + '-content-' + tab;
        	tabs[tab_id] = {
        		text : service.tabs[tab].text
        	};
        }

	    view.set( tabs );

    },

    emmContentRender : function( service, tab ) {

    	/* called when a tab becomes active */

        this.content.set( new media.view.EMM({
            service:    service,
            controller: this,
            model:      this.state().props.get( tab ),
            tab:        tab,
            className:  'clearfix emm-content emm-content-' + service.id
        }) );

    },
    
    emmToolbarCreate : function( toolbar ) {
        toolbar.view = new media.view.Toolbar.EMM({
		    controller: this
	    });
    }

});

// CONTROLLER:

media.controller.EMM = media.controller.State.extend({

    initialize: function( options ) {

        this.props = new Backbone.Collection();

        for ( tab in options.tabs ) {

	        this.props.add( new Backbone.Model({
	        	id       : tab,
	        	params   : {},
	        	selected : null,
	        	page     : null,
	        	min_id   : null,
	        	max_id   : null
	        }) );

        }

        this.props.on( 'change:selected', this.refresh, this );

    },

    refresh: function() {
    	this.frame.toolbar.get().refresh();
	},

	emmInsert: function() {

		var insert = '';

	    _.each( this.frame.content.get().model.get( 'selected' ), function( model ) {
	    	insert += '<p>' + model.get( 'url' ) + '</p>';
	    }, this );

    	media.editor.insert( insert );

	    this.frame.close();

	}
    
});

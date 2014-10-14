var builddate, buildtime, buttonmenu, editbutton, 
delbutton, hashchanger, 
pn, RanjanObj, showview, svhandler, viewcryptcards, viewlibrarycards, searchcryptcards;  

viewcryptcards   = document.querySelector('[data-show="#allcryptcards"]');
viewlibrarycards   = document.querySelector('[data-show="#alllibrarycards"]');
buttonmenu = document.getElementById('buttonwrapper');
editbutton = document.querySelector('button[type=button].edit');
delbutton  = document.querySelector('button[type=button].delete');
initializebutton  = document.querySelector('button[type=button].initialize');

showview = document.querySelectorAll('button.clicktarget');

/*=============================
Utility functions
===============================*/

RanjanObj = function () {
    'use strict';
    
    Object.defineProperty(this, 'pdbcrypt', {writable: true});
    Object.defineProperty(this, 'pdblibrary', {writable: true});
    Object.defineProperty(this, 'remote', {writable: true});
    Object.defineProperty(this, 'formobject', {writable: true});
    Object.defineProperty(this, 'cryptcardtable', {writable: true});
    Object.defineProperty(this, 'librarycardtable', {writable: true});
 	Object.defineProperty(this, 'searchformobject', {writable: true});
 	Object.defineProperty(this, 'errordialog', {writable: true});

    this.pdbcrypt = new PouchDB('pouchcrypt', {adapter: 'websql'}); // websql has better performances
	if (!this.pdbcrypt.adapter) { // websql not supported by this browser
		this.pdbcrypt = new PouchDB('pouchcrypt');
	}
    this.pdblibrary = new PouchDB('pouchlibrary', {adapter: 'websql'}); // websql has better performances
	if (!this.pdblibrary.adapter) { // websql not supported by this browser
		this.pdblibrary = new PouchDB('pouchlibrary');
	}
	
    this.remote = ''; //remoteorigin + '/' + databasename; // not used
};

RanjanObj.prototype.initialize = function () {
    'use strict';
    var o = {}, that = this;

	PouchDB.destroy('pouchcrypt');
    this.pdbcrypt = new PouchDB('pouchcrypt', {adapter: 'websql'}); // websql has better performances
	if (!this.pdbcrypt.adapter) { // websql not supported by this browser
		this.pdbcrypt = new PouchDB('pouchcrypt');
	}
    this.pdblibrary = new PouchDB('pouchlibrary', {adapter: 'websql'}); // websql has better performances
	if (!this.pdblibrary.adapter) { // websql not supported by this browser
		this.pdblibrary = new PouchDB('pouchlibrary');
	}

	// load the crypt documents first, we'll load the library in the callback
	var cryptdocs = getcryptdocs();
	this.show('#syncdialog');
    this.pdbcrypt.bulkDocs(cryptdocs, function (error, response) {
        if(error){
            that.showerror(error);
        }
		else {
			//	now load the library documents
			var librarydocs = getlibrarydocs();
			that.pdblibrary.bulkDocs(librarydocs, function (error, response) {
				that.hide('#syncdialog');

				if(error){
					that.showerror(error);
				}

				that.viewcryptcardset();
				that.viewlibrarycardset();
				
				viewcryptcards.dispatchEvent(new MouseEvent('click')); 
				viewlibrarycards.dispatchEvent(new MouseEvent('click')); 
				that.resethash();
			});
		}
	});
}

RanjanObj.prototype.buildtime = function(timestamp){
    var ts = new Date(+timestamp), time = [], pm, ampm;
    
    pm = (ts.getHours() > 12);
    
    time[0] = pm ? ts.getHours() - 12 : ts.getHours();
    time[1] = ('0'+ts.getMinutes()).substr(-2);
    
    if( time[0] == 12 ){
    	ampm = 'pm';
    } else {
    	ampm = pm ? 'pm' : 'am';
    }
    
    return ' @ '+time.join(':') + ampm ; 
}

RanjanObj.prototype.builddate = function (timestamp) {
    var d = [], date = new Date(timestamp);
   
    d[0] = date.getFullYear();
    d[1] = ('0'+(date.getMonth() + 1)).substr(-2);
    d[2] = ('0'+date.getDate()).substr(-2);
    return d.join('-');
} 

/* 
Create a function to log errors to the console for
development.
*/

RanjanObj.prototype.reporter = function (error, response) {
    'use strict';
    if (console !== undefined) {
        if (error) { console.log(error); }
        if (response) { console.log(response); }
    }
};

RanjanObj.prototype.showerror = function (error) {
    var o, txt, msg = this.errordialog.getElementsByClassName('msg')[0];
    for(o in error){
    	txt = document.createTextNode(error[o]);
    	msg.appendChild(txt);
    }
	this.show('#errordialog');
};

RanjanObj.prototype.show = function (selector) {
    'use strict';
    var els = document.querySelectorAll(selector);
    Array.prototype.map.call(els, function (el) {
        el.classList.remove('hide');
    });
};
RanjanObj.prototype.hide = function (selector) {
    'use strict';
    var els = document.querySelectorAll(selector);
    Array.prototype.map.call(els, function (el) {
        el.classList.add('hide');
    });
};
RanjanObj.prototype.resethash = function () {
    window.location.hash = '';   
}

RanjanObj.prototype.savenote = function () {
    'use strict';
    var o = {}, that = this;

    /* 
    If we have an _id, use it. Otherwise, create a timestamp
    for to use as an ID. IDs must be strings, so convert with `+ ''`
    */
    if (!this.formobject._id.value) {
        o._id = new Date().getTime() + ''; 
    } else {
        o._id = this.formobject._id.value;
    }
    
    if (this.formobject._rev.value) {
        o._rev = this.formobject._rev.value; 
    }
    
    /* 
    Build the object based on whether the field has a value.
    This is a benefit of a schema-free object store type of 
    database. We don't need to include values for every property.
    */
    
    o.notetitle = (this.formobject.notetitle.value == '') ? 'Untitled Note' : this.formobject.notetitle.value;
    o.note      = (this.formobject.note.value == '') ? '' : this.formobject.note.value;
    o.tags      = (this.formobject.tags.value == '') ? '' : this.formobject.tags.value;
    o.modified  = new Date().getTime();
    
    this.pdbcrypt.put(o, function (error, response) {
        if(error){
            that.showerror(error);
        }
        
        if(response && response.ok){     	    	
     		if(that.formobject.attachment.files.length){
				var reader = new FileReader();
				
				/* 
				Using a closure so that we can extract the 
				File's data in the function.
				*/
				reader.onload = (function(file){
					return function(e) {
						that.pdbcrypt.putAttachment(response.id, file.name, response.rev, e.target.result, file.type);
					}
				})(that.formobject.attachment.files.item(0));
				
				reader.readAsDataURL(that.formobject.attachment.files.item(0));
			}
			    	   			
           	that.viewcryptcardset();
           	that.viewlibrarycardset();
        	that.formobject.reset();
        	
        	that.show(that.formobject.dataset.show);
           	that.hide(that.formobject.dataset.hide);
        	
           	viewcryptcards.dispatchEvent(new MouseEvent('click')); 
           	viewlibrarycards.dispatchEvent(new MouseEvent('click')); 
		}
    });
 	
 	this.resethash();
};

RanjanObj.prototype.viewnote = function (noteid) {
    'use strict';
    
    var that = this, noteform = this.formobject;
    
    this.pdbcrypt.get(noteid, {attachments:true}, function (error, response) {
        var fields = Object.keys(response), o, link, attachments, li;
    
    	if (error) {
           	this.showerror();
            return;
        } else {
        	
        	fields.map( function (f) {
				if (noteform[f] !== undefined && noteform[f].type != 'file') {
					noteform[f].value = response[f];
				}
				if (f == '_attachments') {
					attachments = response[f];
					for (o in attachments) {
						li = document.createElement('li');
						link = document.createElement('a');
						link.href = 'data:' + attachments[o].content_type + ';base64,' + attachments[o].data;
						link.target = "_blank";
						link.appendChild(document.createTextNode(o));
						li.appendChild(link);
					}
					document.getElementById('attachmentlist').appendChild(li);
								
				}	
			})
                
            // fill in form fields with response data.     
            that.show('#addnote');
            that.hide('section:not(#addnote)');
            that.show('#attachments');	
        } 
    }); 
    
 	if (window.location.hash.indexOf(/view/) > -1 ) {
        // disable form fields
        noteform.classList.add('disabled');
        
        Array.prototype.map.call( noteform.querySelectorAll('input, textarea'), function(i){
        	if (i.type !== 'hidden') {
        		i.disabled = 'disabled';
        	}
        });
        
        buttonmenu.classList.remove('hide');
    }
}

RanjanObj.prototype.deletenote = function (noteid) {
	var that = this;
	/* IDs must be a string */
    
 	this.pdbcrypt.get(noteid+'', function (error, doc) {
		that.pdbcrypt.remove(doc, function (e, r) {	
        	if(e){
        		that.showerror();
        	} else {
        		viewcryptcards.dispatchEvent(new MouseEvent('click'));
        	}            
    	});
    });
}

/* 
TO DO: refactor so we can reuse this function.
*/
RanjanObj.prototype.viewcryptcardset = function (start, end) {
    var i, 
    that = this, 
    df = document.createDocumentFragment(), 
    options = {}, 
    row,   
    nl = this.cryptcardtable.querySelector('tbody');    
		
    options.include_docs = true;
    
    if(start){ options.startkey = start; }
    if(end){ options.endkey = end; }
    
    this.pdbcrypt.allDocs(options, function (error, response) {
    	/* 
    	What's `this` changes when a function is called
    	with map. That's why we're passing `that`.
    	*/    	
        row = response.rows.map(that.addcryptrow, that);
        row.map(function(f){
        	if (f) {
            	df.appendChild(f); 
            } 
        });
        
        i = nl.childNodes.length;    
		while(i--){
			nl.removeChild(nl.childNodes.item(i));   
		}
	
        nl.appendChild(df);
    });
    
    this.resethash();
}

RanjanObj.prototype.viewlibrarycardset = function (start, end) {
    var i, 
    that = this, 
    df = document.createDocumentFragment(), 
    options = {}, 
    row,   
    nl = this.librarycardtable.querySelector('tbody');    
		
    options.include_docs = true;
    
    if(start){ options.startkey = start; }
    if(end){ options.endkey = end; }
    
    this.pdblibrary.allDocs(options, function (error, response) {
    	/* 
    	What's `this` changes when a function is called
    	with map. That's why we're passing `that`.
    	*/    	
        row = response.rows.map(that.addlibraryrow, that);
        row.map(function(f){
        	if (f) {
            	df.appendChild(f); 
            } 
        });
        
        i = nl.childNodes.length;    
		while(i--){
			nl.removeChild(nl.childNodes.item(i));   
		}
	
        nl.appendChild(df);
    });
    
    this.resethash();
}

RanjanObj.prototype.addcryptrow = function (obj) {
    var tr, td, a, o, clan;
 	
    a  = document.createElement('a');
    tr = document.createElement('tr');
    td = document.createElement('td'); 
    
    a.href = '#/view/'+obj.id;
    a.innerHTML = obj.doc.notetitle === undefined ? 'Unknown' : obj.doc.notetitle;
    td.appendChild(a);
    tr.appendChild(td);

    clan = td.cloneNode(false);
    clan.innerHTML = 'Ventrue';
    
    // updated = created.cloneNode();
    // updated.innerHTML = obj.doc.modified ? this.builddate(+obj.doc.modified) + this.buildtime(+obj.doc.modified) : this.builddate(+obj.id) + this.buildtime(+obj.id);

    tr.appendChild(clan);
  
    return tr;    
}

RanjanObj.prototype.addlibraryrow = function (obj) {
    var tr, td, a, o, cardtype;
 	
    a  = document.createElement('a');
    tr = document.createElement('tr');
    td = document.createElement('td'); 
    
    a.href = '#/view/'+obj.id;
    a.innerHTML = obj.doc.notetitle === undefined ? 'Unknown' : obj.doc.notetitle;
    td.appendChild(a);
    tr.appendChild(td);

    cardtype = td.cloneNode(false);
    cardtype.innerHTML = 'Action';
      
    // updated = created.cloneNode();
    // updated.innerHTML = obj.doc.modified ? this.builddate(+obj.doc.modified) + this.buildtime(+obj.doc.modified) : this.builddate(+obj.id) + this.buildtime(+obj.id);
    
    tr.appendChild(cardtype);
  
    return tr;    
}

RanjanObj.prototype.search = function(searchkey) {
	var that = this;

	var map = function(doc) {
		/* 
		Need to do grab the value directly because 
		there isn't a way to pass it any other way.
		*/
		
		var searchkey,regex;
		searchkey = document.getElementById('q').value.replace(/[$-\/?[-^{|}]/g, '\\$&');
		regex = new RegExp(searchkey,'i');
		
		if( regex.test(doc.notetitle) || regex.test(doc.note) || regex.test(doc.tags) ){		
			emit(doc._id, {notetitle: doc.notetitle, id: doc._id, modified: doc.modified});
		}
	}
	
  	this.pdbcrypt.query(map, function(err, response) { 
  		if(err){ console.log(err); }
  		if(response){
	 		var df, rows, nl, results;
	 		
	 		results = response.rows.map(function(r){
  				r.doc = r.value;
  				delete r.value;
  				return r;
  			});
  			nl = that.cryptcardtable.getElementsByTagName('tbody')[0];
  			df = document.createDocumentFragment(), 
  			rows = results.map(that.addcryptrow, that);
  			rows.map(function(f){
        		if (f) {
            		df.appendChild(f); 
            	} 
        	});
        	nl.innerHTML = '';
        	nl.appendChild(df);
  		}
  	});
}


/*------ Maybe do in a try-catch ? ------*/
pn = new RanjanObj();

pn.formobject = document.getElementById('noteform');
pn.cryptcardtable  = document.getElementById('cryptcardlist');
pn.librarycardtable  = document.getElementById('librarycardlist');
pn.searchformobject  = document.getElementById('searchcryptcards');
pn.errordialog  = document.getElementById('errordialog');

pn.searchformobject.addEventListener('submit', function (e) {
   'use strict';
    e.preventDefault();
    pn.search(); 
});

pn.formobject.addEventListener('submit', function (e) {
    e.preventDefault();
    pn.savenote()
});

pn.formobject.addEventListener('reset', function (e) {
    var disableds = document.querySelectorAll('#noteform [disabled]');
    e.target.classList.remove('disabled');
    Array.prototype.map.call(disableds, function(o){
        o.removeAttribute('disabled'); 
    });
    pn.hide('#attachments');
    document.getElementById('attachmentlist').innerHTML = '';
});

window.addEventListener('hashchange', function (e) {
    var noteid;
    if(window.location.hash.replace(/#/,'') ){
        noteid = window.location.hash.match(/\d/g).join('');
        pn.viewnote(noteid);
    }
});

svhandler = function (evt) {
	var attchlist = document.getElementById('attachmentlist');
	
    if (evt.target.dataset.show) {
        pn.show(evt.target.dataset.show);
    }
    if (evt.target.dataset.hide) {
        pn.hide(evt.target.dataset.hide);
    }
    
    if (evt.target.dataset.action) {
        pn[evt.target.dataset.action]();
    }
    
    if (evt.target.dataset.show === '#addnote') {
        pn.formobject.reset();
        
        /* Force reset on hidden fields. */
        pn.formobject._id.value = ''; 
        pn.formobject._rev.value = ''; 
    }
    pn.hide('#attachments');
    attchlist.innerHTML = '';
    pn.searchformobject.reset();
    pn.resethash();
};

/* TO DO: Refactor these click actions to make the functions reusable */

editbutton.addEventListener('click', function (e) {
    pn.formobject.classList.remove('disabled'); 
    
     Array.prototype.map.call( pn.formobject.querySelectorAll('input, textarea'), function(i){
		if (i.type !== 'hidden') {
			i.removeAttribute('disabled');
		}
	});
});

delbutton.addEventListener('click', function (e) {
    pn.deletenote(+e.target.form._id.value);
});

initializebutton.addEventListener('click', function (e) {
    pn.initialize();
});

Array.prototype.map.call(showview, function (ct) {
    ct.addEventListener('click', svhandler);
});
   
Array.prototype.map.call(document.getElementsByClassName('dialog'), function (d) {
    d.addEventListener('click', function(evt){
        if(evt.target.dataset.action === 'close'){
            d.classList.add('hide');
        };
    });
});

window.addEventListener('DOMContentLoaded', function(event){
    viewcryptcards.dispatchEvent(new MouseEvent('click'));
});

pn.formobject.addEventListener('change', function(event){
	if(event.target.type === 'file'){
		var fn = event.target.value.split('\\');
		document.querySelector('.filelist').innerHTML = fn.pop();
	}
});

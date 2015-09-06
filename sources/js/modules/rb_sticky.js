( function() {
	'use strict';
	/* jshint eqnull: true */
	var rb = window.rb;
	var $ = rb.$;
	var isContainerScroll = {scroll: 1, auto: 1};
	var isContainerAncestor = {parent: 'parentNode', positionedParent: 'offsetParent'};
	var docElem = document.documentElement;
	var extend = function(){
		var Scrolly = rb.life._behaviors.scrolly;
		if(Scrolly){
			Sticky.prototype.setupChilds = Scrolly.prototype.setupChilds;
			Sticky.prototype.updateChilds = Scrolly.prototype.updateChilds;
			Sticky.prototype.getCssValue = Scrolly.prototype.getCssValue;
			extend = rb.$.noop;
		}
	};
	var Sticky = rb.life.Widget.extend('sticky', {
		defaults: {
			container: 'positionedParent', // false || 'parent' || 'positionedParent' || '.selector'
			disabled: false,
			topOffset: false,
			bottomOffset: false,
			progress: 0,
			childSel: '.sticky-element',
			setWidth: true,
		},

		init: function(element){
			this._super(element);

			this.isFixed = false;
			this.isScrollFixed = false;
			this.checkTime = 666 + (666 * Math.random());

			this.progress = -1;
			this.onprogress = $.Callbacks();

			this.updateChilds = rb.rAF(this.updateChilds, true);
			this.onprogress.fireWith = rb.rAF(this.onprogress.fireWith);
			this.updateLayout = rb.rAF(this.updateLayout, true);

			this.calculateLayout = this.calculateLayout.bind(this);
			this.checkPosition = this.checkPosition.bind(this);

			this._getElements();
			this.calculateLayout();
		},
		setupChilds: function(){},
		updateChilds: function(){},
		_getElements: function(){
			var offsetName;

			var options = this.options;
			this.isContainerScroll = false;

			this.elemStyles = rb.getStyles(this.element);

			this.isStatic = this.elemStyles.position == 'static';

			this.posProp = (options.bottomOffset !== false || (options.topOffset === false && this.elemStyles.bottom != 'auto')) ?
				'bottom' :
				'top'
			;

			offsetName = this.posProp + 'Offset';

			this.offset = 0;
			this.nativeOffset = 0;

			if(this.isStatic){
				this.nativeOffset = $.css(this.element, this.posProp, true, this.elemStyles) || 0;
				this.offset -= this.nativeOffset;
			}

			if(options[offsetName] !== false){
				this.offset -= options[offsetName];
			}

			if(options.container){
				this.container = this.element[options.container] || this.element[isContainerAncestor[options.container]] || this.$element.closest(options.container).get(0);
				if(this.container == document.body || this.container == docElem){
					this.container = null;
				} else {
					this.isContainerScroll = !!isContainerScroll[$.css(this.container, 'overflowY', false, this.containerStyles) || $.css(this.container, 'overflow', false, this.containerStyles)];
					this.containerStyles = rb.getStyles(this.container);
				}
			}

			if(this.isContainerScroll){
				this.$scrollEventElem = this.$container;
				this.scrollingElement = this.$container.get(0);
			} else {
				this.$scrollEventElem = $(window);
				this.scrollingElement = rb.getScrollingElement();
			}
		},
		calculateLayout: function(){
			var box, elemOffset, containerBox, containerOffset, viewport;

			this.minFixedPos = -1;
			this.maxFixedPos = Number.MAX_VALUE;
			this.minScrollPos = this.maxFixedPos;
			this.maxScrollPos = this.minFixedPos;

			this.scroll = this.scrollingElement.scrollTop;

			viewport = docElem.clientHeight;

			this.lastCheck = Date.now();

			box = (this.isFixed ? this.clone : this.element).getBoundingClientRect();

			if(!box.right && !box.bottom && !box.top && !box.left){return;}

			elemOffset = box[this.posProp] + this.scroll;

			if(this.options.setWidth){
				this.elemWidth = (this.isFixed ? this.clone : this.element).offsetWidth;
			}

			if(this.posProp == 'top'){
				this.minFixedPos = elemOffset + this.offset;
				if(this.options.progress){
					this.minProgressPos = this.minFixedPos;
					this.maxProgressPos = this.minFixedPos + this.options.progress;
				}
			} else {
				this.maxFixedPos = elemOffset - this.offset - viewport;
				if(this.options.progress){
					this.minProgressPos = this.maxFixedPos - this.options.progress;
					this.maxProgressPos = this.maxFixedPos;
				}
			}

			if(this.container){
				containerBox = this.container.getBoundingClientRect();

				containerOffset = containerBox[this.posProp == 'top' ? 'bottom' : 'top'] + this.scroll;

				if(this.posProp == 'top'){
					this.maxFixedPos = containerOffset + this.offset;
					this.minScrollPos = this.maxFixedPos - box.height -
					$.css(this.container, 'padding-bottom', true, this.containerStyles) -
					$.css(this.element, 'margin-bottom', true, this.elemStyles);
					this.maxFixedPos += 9;
					this.maxScrollPos = this.maxFixedPos;
				} else {
					this.minFixedPos = containerOffset - docElem.clientHeight - this.offset;
					this.maxScrollPos = this.minFixedPos + box.height +
						$.css(this.container, 'padding-top', true, this.containerStyles) +
						$.css(this.element, 'margin-top', true, this.elemStyles);
					this.minFixedPos += 9;
					this.minScrollPos = this.minFixedPos;
				}
			}

			this.checkPosition();
		},
		checkPosition: function(){
			var shouldFix, shouldScroll, shouldWidth, progress, wasProgress;
			this.scroll = this.scrollingElement.scrollTop;

			if(Date.now() - this.lastCheck > this.checkTime){
				this.calculateLayout();
				return;
			}

			shouldFix =  this.scroll >= this.minFixedPos && this.scroll <= this.maxFixedPos;
			shouldScroll = shouldFix && (this.scroll >= this.minScrollPos && this.scroll <= this.maxScrollPos);

			if(shouldFix && !this.isFixed){
				this.elemHeight = this.element.offsetHeight;
				if(this.options.setWidth){
					this.elemWidth = this.element.offsetWidth;
				}
			}

			shouldWidth = shouldFix && this.isFixed && this.options.setWidth && this.element.offsetWidth != this.elemWidth;

			if(shouldFix != this.isFixed || shouldScroll || this.isScrollFixed || shouldWidth){
				this.updateLayout(shouldFix, shouldScroll, shouldWidth);
			}

			if(
				this.options.progress &&
				(
					(shouldFix && this.scroll >= this.minProgressPos && this.scroll <= this.maxProgressPos) ||
					(this.progress !== 0 && this.progress !== 1)
				)
			){
				progress = 1 - Math.max(Math.min((this.scroll - this.minProgressPos) / (this.maxProgressPos - this.minProgressPos), 1), 0);
				wasProgress = this.progress;

				if(!shouldFix && wasProgress == -1){return;}

				if(wasProgress != progress){
					this.progress = progress;

					if(!this.childs || !this.childAnimations){
						this.setupChilds();
					}

					this.updateChilds();
					this.onprogress.fireWith(this, [progress]);
				}
			}
		},
		updateLayout: function(shouldFix, shouldScroll, shouldWidth){
			var offset;

			if(shouldWidth){
				this.element.style.width = this.elemWidth + 'px';
			}

			if(shouldFix){
				if(!this.isFixed){
					this._fix();
				}

				if(shouldScroll){
					this.isScrollFixed = true;
					offset = this.offset * -1;

					if(this.posProp == 'top'){
						offset += (this.minScrollPos - this.scroll);
					} else {
						offset -= this.maxScrollPos - this.scroll;
					}

					this.element.style[this.posProp] = offset +'px';
				} else if(this.isScrollFixed){
					this.isScrollFixed = false;
					this.element.style[this.posProp] = (this.offset * -1) +'px';
				}

			} else if(this.isFixed) {
				this._unfix();
			}
		},
		_unfix: function(){
			if(!this.isFixed){return;}
			this.isFixed = false;
			this.isScrollFixed = false;
			this.element.classList.remove('is-fixed');
			this.detachClone();
			this.element.style.position = '';
			this.element.style.width = '';
			this.element.style[this.posProp] = '';
		},
		_fix: function(){
			if(this.isFixed){return;}
			this.isFixed = true;
			this.isScrollFixed = false;
			this.attachClone();
			this.element.classList.add('is-fixed');
			this.element.style.position = 'fixed';

			if(this.options.setWidth){
				this.element.style.width = this.elemWidth +'px';
			}

			this.element.style[this.posProp] = (this.offset * -1) +'px';
		},
		attachClone: function(){
			if(!this.$clone){
				this.clone = this.element.cloneNode();
				this.$clone = $(this.clone);

				//ToDo: remove life.initClass
				this.$clone
					.css({visibility: 'hidden'})
					.removeClass(rb.life.initClass)
					.addClass('sticky-clone')
					.attr({
						'data-module': '',
						'aria-hidden': 'true',
					})
				;
			}

			this.$clone.css({height: this.elemHeight + 'px',});
			this.$element.after(this.clone);
		},
		detachClone: function(){
			if(this.$clone){
				this.$clone.detach();
			}
		},
		onceAttached: function(){

		},
		setOption: function(name, value){
			this._super(name, value);
		},
		attached: function(){
			this.$scrollEventElem.on('scroll', this.checkPosition);
			rb.resize.on(this.calculateLayout);
			clearInterval(this.layoutInterval);
			this.layoutInterval = setInterval(this.calculateLayout, Math.round((999 * Math.random()) + 9999));
		},
		detached: function(){
			this.$scrollEventElem.off('scroll', this.checkPosition);
			rb.resize.off(this.calculateLayout);
			clearInterval(this.layoutInterval);
		},
	});

	extend();
	setTimeout(extend);
})();

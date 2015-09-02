( function() {
	'use strict';
	/* jshint eqnull: true */
	var rb = window.rb;
	var $ = rb.$;
	var isContainerScroll = {scroll: 1, auto: 1};
	var isContainerAncestor = {parent: 'parentNode', positionedParent: 'offsetParent'};
	var docElem = document.documentElement;

	rb.life.Widget.extend('sticky', {
		defaults: {
			container: 'positionedParent', // false || 'parent' || 'positionedParent' || '.selector'
			disabled: false,
			topOffset: false,
			bottomOffset: false,
		},

		init: function(element){
			this._super(element);

			this.isFixed = false;

			this.updateLayout = rb.rAF(this.updateLayout, true);

			this.calculateLayout = this.calculateLayout.bind(this);
			this.checkPosition = this.checkPosition.bind(this);
			this.calculateLayout();
		},
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

			this.elemWidth = this.element.offsetWidth;

			if(this.isStatic){
				this.nativeOffset = $.css(this.element, this.posProp, true, this.elemStyles) || 0;
				this.offset -= this.nativeOffset;
			}

			if(options[offsetName] !== false){
				this.offset -= options[offsetName];
			}

			if(options.container){
				this.container = this.element[options.container] || this.element[isContainerAncestor[options.container]] || this.$element.closest(options.container).get(0);

				this.containerStyles = rb.getStyles(this.container);
				this.isContainerScroll = !!isContainerScroll[$.css(this.container, 'overflowY', false, this.containerStyles) || $.css(this.container, 'overflow', false, this.containerStyles)];
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

			if(this.isFixed){
				this._unfix();
			}

			this._getElements();

			this.minFixedPos = -1;
			this.minScrollPos = this.minFixedPos;
			this.maxFixedPos = Number.MAX_VALUE;
			this.maxScrollPos = this.maxFixedPos;

			this.scroll = this.scrollingElement.scrollTop;
			viewport = docElem.clientHeight;

			box = this.element.getBoundingClientRect();
			elemOffset = box[this.posProp] + this.scroll;

			if(this.posProp == 'top'){
				this.minFixedPos = elemOffset + this.offset;
			} else {
				this.maxFixedPos = elemOffset - this.offset - viewport;
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
			this.scroll = this.scrollingElement.scrollTop;
			var shouldFix =  this.scroll >= this.minFixedPos && this.scroll <= this.maxFixedPos;
			var shouldScroll = shouldFix && (this.scroll >= this.minScrollPos && this.scroll <= this.maxScrollPos);
			if(shouldFix != this.isFixed || shouldScroll){
				this.updateLayout(shouldFix, shouldScroll);
			}
		},
		updateLayout: function(shouldFix, shouldScroll){
			var offset;

			if(shouldFix){
				if(!this.isFixed){
					this._fix();
				}

				if(shouldScroll){
					offset = this.offset * -1;
					if(this.posProp == 'top'){
						offset += (this.minScrollPos - this.scroll);
					} else {
						offset -= this.maxScrollPos - this.scroll;
					}
					this.element.style[this.posProp] = offset +'px';
				}
			} else if(this.isFixed) {
				this._unfix();
			}
		},
		_unfix: function(){
			if(!this.isFixed){return;}
			this.isFixed = false;
			this.element.classList.remove('is-fixed');
			this.detachClone();
			this.element.style.position = '';
			this.element.style.width = '';
			this.element.style[this.posProp] = '';
		},
		_fix: function(){
			if(this.isFixed){return;}

			this.isFixed = true;
			this.attachClone();
			this.element.classList.add('is-fixed');
			this.element.style.position = 'fixed';
			this.element.style.width = this.elemWidth +'px';
			this.element.style[this.posProp] = (this.offset * -1) +'px';
		},
		attachClone: function(){
			if(!this.$clone){
				this.$clone = $(this.element.cloneNode());

				this.$clone.css({visibility: 'hidden'}).removeClass('js-rb-life');
			}
			this.$element.after(this.$clone.get(0));
		},
		detachClone: function(){
			if(this.$clone){
				this.$clone.remove();
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
		},
		detached: function(){
			this.$scrollEventElem.off('scroll', this.checkPosition);
			rb.resize.off(this.calculateLayout);
		},
	});
})();

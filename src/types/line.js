// Line Annotation implementation
module.exports = function(Chart) {
	var chartHelpers = Chart.helpers;
	var helpers = require('../helpers.js')(Chart);

	var horizontalKeyword = 'horizontal';
	var verticalKeyword = 'vertical';

	function LineFunction(view) {
		// Describe the line in slope-intercept form (y = mx + b).
		// Note that the axes are rotated 90° CCW, which causes the
		// x- and y-axes to be swapped.
		var m = (view.x2 - view.x1) / (view.y2 - view.y1);
		var b = view.x1 || 0;

		this.m = m;
		this.b = b;

		this.getX = function(y) {
			// Coordinates are relative to the origin of the canvas
			return m * (y - view.y1) + b;
		};

		this.getY = function(x) {
			return ((x - b) / m) + view.y1;
		};

		this.intersects = function(x, y, epsilon) {
			epsilon = epsilon || 0.001;
			var dy = this.getY(x);
			var dx = this.getX(y);
			return (
				(!isFinite(dy) || Math.abs(y - dy) < epsilon) &&
				(!isFinite(dx) || Math.abs(x - dx) < epsilon)
			);
		};
	}

    function fitToViewPortByX(view, width, padWidth, ret) {
        if(ret.x - padWidth < 0) {
            ret.x = padWidth;
        } else if(ret.x + width > view.clip.x2) {
            ret.x = view.clip.x2 - width - padWidth;
        }
        return ret;
	}

    function calculateMainLabelPosition(view, width, height, padWidth, padHeight, activeEl, isSubTitleEnabled) {
        var ret = {x: 0, y: 0};

        console.log('@@@ calculateMainLabelPosition()', JSON.stringify({
            view:view,
            width:width,
            height:height,
            padWidth:padWidth,
            padHeight:padHeight
        } ,null, 2), activeEl);

        ret.x = ((view.x1 + view.x2 - width) / 2);
        ret.y = ((view.y1 + view.y2 - height) / 2);

        ret = fitToViewPortByX(view, width, padWidth,  ret);
		if(isSubTitleEnabled){
			ret.y -= 40;
		}
        return ret;
	}

    function calculateSubLabelPosition(view, width, height, padWidth, padHeight, activeEl, isEnabled) {
		if(!isEnabled){
			return {
				x: -9999,
				y: -9999
			};
		}
        var ret = {x: 0, y: 0};

        console.log('@@@ calculateSubLabelPosition()', JSON.stringify({
            view:view,
			width:width,
			height:height,
            padWidth:padWidth,
            padHeight:padHeight
		} ,null, 2), activeEl, ret);

        ret.x = ((view.x1 + view.x2 - width) / 2);
        ret.y = ((view.y1 + view.y2 - height) / 2);

        ret = fitToViewPortByX(view,width, padWidth, ret);

        return ret;
	}

	function calculateLabelPosition(view, width, height, padWidth, padHeight) {
		var line = view.line;
		var ret = {};
		var xa = 0;
		var ya = 0;

		switch (true) {
		// top align
		case view.mode === verticalKeyword && view.labelPosition === 'top':
			ya = padHeight + view.labelYAdjust;
			xa = (width / 2) + view.labelXAdjust;
			ret.y = view.y1 + ya;
			ret.x = (isFinite(line.m) ? line.getX(ret.y) : view.x1) - xa;
			break;

		// bottom align
		case view.mode === verticalKeyword && view.labelPosition === 'bottom':
			ya = height + padHeight + view.labelYAdjust;
			xa = (width / 2) + view.labelXAdjust;
			ret.y = view.y2 - ya;
			ret.x = (isFinite(line.m) ? line.getX(ret.y) : view.x1) - xa;
			break;

		// left align
		case view.mode === horizontalKeyword && view.labelPosition === 'left':
			xa = padWidth + view.labelXAdjust;
			ya = -(height / 2) + view.labelYAdjust;
			ret.x = view.x1 + xa;
			ret.y = line.getY(ret.x) + ya;
			break;

		// right align
		case view.mode === horizontalKeyword && view.labelPosition === 'right':
			xa = width + padWidth + view.labelXAdjust;
			ya = -(height / 2) + view.labelYAdjust;
			ret.x = view.x2 - xa;
			ret.y = line.getY(ret.x) + ya;
			break;

		// center align
		default:
			ret.x = ((view.x1 + view.x2 - width) / 2) + view.labelXAdjust;
			ret.y = ((view.y1 + view.y2 - height) / 2) + view.labelYAdjust;
		}

		return ret;
	}

	var LineAnnotation = Chart.Annotation.Element.extend({
		setDataLimits: function() {
			var model = this._model;
			var options = this.options;

			// Set the data range for this annotation
			model.ranges = {};
			model.ranges[options.scaleID] = {
				min: options.value,
				max: options.endValue || options.value
			};
		},
		configure: function() {
			console.log('***', 'configure()');
			var model = this._model;
            var options = this.options;
			var chartInstance = this.chartInstance;
			var ctx = chartInstance.chart.ctx;
            var index = chartInstance.chart.annotation._index;
            var activeElement = this.chartInstance.chart.config.data.datasets[0].data[index];
            if(activeElement){
                options.value = activeElement.x;
            }
			var scale = chartInstance.scales[options.scaleID];
			var pixel, endPixel;
			if (scale) {
				pixel = helpers.isValid(options.value) ? scale.getPixelForValue(options.value) : NaN;
				endPixel = helpers.isValid(options.endValue) ? scale.getPixelForValue(options.endValue) : pixel;
			}

			if (isNaN(pixel)) {
				return;
			}

			var chartArea = chartInstance.chartArea;

			// clip annotations to the chart area
			model.clip = {
				x1: chartArea.left,
				x2: chartArea.right,
				y1: chartArea.top,
				y2: chartArea.bottom
			};

			if (this.options.mode === horizontalKeyword) {
				model.x1 = chartArea.left;
				model.x2 = chartArea.right;
				model.y1 = pixel;
				model.y2 = endPixel;
			} else {
				model.y1 = chartArea.top;
				model.y2 = chartArea.bottom;
				model.x1 = pixel;
				model.x2 = endPixel;
			}

			model.line = new LineFunction(model);
			model.mode = options.mode;

            // Figure out the subLabel:
            var subLabelEnabled = options.subLabel.callbacks.enabled(index);
            if(subLabelEnabled || true) {
            	var subLabelLabel = options.subLabel.callbacks.label(index);
				var subLabelTitle = options.subLabel.callbacks.title(index);
				model.subLabelBackgroundColor = options.subLabel.backgroundColor;
				model.subLabelFontFamily = options.subLabel.fontFamily;
				model.subLabelFontSize = options.subLabel.fontSize;
				model.subLabelFontStyle = options.subLabel.fontStyle;
				model.subLabelFontColor = options.subLabel.color;
                model.subLabelSecondaryFontColor = 'rgb(0, 0, 0, 0.56)';
				model.subLabelXPadding = options.subLabel.xPadding;
				model.subLabelYPadding = options.subLabel.yPadding;
				model.subLabelCornerRadius = options.subLabel.cornerRadius;
				model.subLabelPosition = options.subLabel.position;
				model.subLabelXAdjust = options.subLabel.xAdjust;
				model.subLabelYAdjust = options.subLabel.yAdjust;
				model.subLabelEnabled = subLabelEnabled;
				model.sublLabelLabel = subLabelLabel;
				model.sublLabelTitle = subLabelTitle;

				ctx.subLabelFont = chartHelpers.fontString(model.subLabelFontSize, model.subLabelFontStyle, model.subLabelFontFamily);

                var subLabelLabelWidth = ctx.measureText(model.sublLabelLabel).width + 15;
                var subLabelTitleWidth = ctx.measureText(model.sublLabelTitle).width + 15;

                var subLabelTextWidth = Math.max(subLabelLabelWidth, subLabelTitleWidth);
                model.sublLabelLineHeight = ctx.measureText('M').width;
				var subLabelTextHeight = model.sublLabelLineHeight * 3.5;

				var subLabelPosition = calculateSubLabelPosition(
					model,
					subLabelTextWidth,
					subLabelTextHeight,
					model.subLabelXPadding,
					model.subLabelYPadding,
					this.chartInstance.chart.active ? this.chartInstance.chart.active[0] : null,
                    subLabelEnabled
				);

				model.subLabelX = subLabelPosition.x - model.subLabelXPadding;
				model.subLabelY = subLabelPosition.y - model.subLabelYPadding;
				model.subLabelWidth = subLabelTextWidth + (2 * model.subLabelXPadding);
				model.subLabelHeight = subLabelTextHeight + (2 * model.subLabelYPadding);
            }

			// Figure out the label:
			model.labelBackgroundColor = options.label.backgroundColor;
			model.labelFontFamily = options.label.fontFamily;
			model.labelFontSize = options.label.fontSize;
			model.labelFontStyle = options.label.fontStyle;
			model.labelFontColor = options.label.color;
			model.labelXPadding = options.label.xPadding;
			model.labelYPadding = options.label.yPadding;
			model.labelCornerRadius = options.label.cornerRadius;
			model.labelPosition = options.label.position;
			model.labelEnabled = options.label.callbacks.enabled(index);
			model.labelContent = options.label.callbacks.content(index);

			ctx.font = chartHelpers.fontString(model.labelFontSize, model.labelFontStyle, model.labelFontFamily);
			var textWidth = ctx.measureText(model.labelContent).width;
			var textHeight = ctx.measureText('M').width;
			var labelPosition = calculateMainLabelPosition(model, textWidth, textHeight, model.labelXPadding, model.labelYPadding, null, subLabelEnabled);
			model.labelX = labelPosition.x - model.labelXPadding;
			model.labelY = labelPosition.y - model.labelYPadding;
			model.labelWidth = textWidth + (2 * model.labelXPadding);
			model.labelHeight = textHeight + (2 * model.labelYPadding);

			model.borderColor = options.borderColor;
			model.borderWidth = options.borderWidth;
			model.borderDash = options.borderDash || [];
			model.borderDashOffset = options.borderDashOffset || 0;
		},
		inRange: function(mouseX, mouseY) {
			var model = this._model;

			return (
				// On the line
				model.line &&
				model.line.intersects(mouseX, mouseY, this.getHeight())
			) || (
				// On the label
				model.labelEnabled &&
				model.labelContent &&
				mouseX >= model.labelX &&
				mouseX <= model.labelX + model.labelWidth &&
				mouseY >= model.labelY &&
				mouseY <= model.labelY + model.labelHeight
			);
		},
		getCenterPoint: function() {
			return {
				x: (this._model.x2 + this._model.x1) / 2,
				y: (this._model.y2 + this._model.y1) / 2
			};
		},
		getWidth: function() {
			return Math.abs(this._model.right - this._model.left);
		},
		getHeight: function() {
			return this._model.borderWidth || 1;
		},
		getArea: function() {
			return Math.sqrt(Math.pow(this.getWidth(), 2) + Math.pow(this.getHeight(), 2));
		},
		draw: function() {
            console.log('***', 'draw()', this._view);
			var view = this._view;
			var ctx = this.chartInstance.chart.ctx;

			if (!view.clip) {
				return;
			}

			ctx.save();

			// Canvas setup
			ctx.beginPath();
			ctx.rect(view.clip.x1, view.clip.y1, view.clip.x2 - view.clip.x1, view.clip.y2 - view.clip.y1);
			ctx.clip();

			ctx.lineWidth = view.borderWidth;
			ctx.strokeStyle = view.borderColor;

			if (ctx.setLineDash) {
				ctx.setLineDash(view.borderDash);
			}
			ctx.lineDashOffset = view.borderDashOffset;


			if (view.labelEnabled && view.labelContent) {

                // Draw
                ctx.beginPath();
                ctx.moveTo(view.x1, view.y1);
                ctx.lineTo(view.x2, view.y2);
                ctx.stroke();

				ctx.beginPath();
				ctx.rect(view.clip.x1, view.clip.y1, view.clip.x2 - view.clip.x1, view.clip.y2 - view.clip.y1);
				ctx.clip();

				ctx.fillStyle = view.labelBackgroundColor;
				// Draw the tooltip
				chartHelpers.drawRoundedRectangle(
					ctx,
					view.labelX, // x
					view.labelY, // y
					view.labelWidth, // width
					view.labelHeight, // height
					view.labelCornerRadius // radius
				);
				ctx.fill();

				// Draw the text
				ctx.font = chartHelpers.fontString(
					view.labelFontSize,
					view.labelFontStyle,
					view.labelFontFamily
				);
				ctx.fillStyle = view.labelFontColor;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(
					view.labelContent,
					view.labelX + (view.labelWidth / 2),
					view.labelY + (view.labelHeight / 2)
				);
			}

			//Draw SUBLABEL
			if (view.subLabelEnabled || true) {
				ctx.beginPath();
				ctx.rect(view.clip.x1, view.clip.y1, view.clip.x2 - view.clip.x1, view.clip.y2 - view.clip.y1);
				ctx.clip();

				ctx.fillStyle = view.subLabelBackgroundColor;
				// Draw the tooltip
				chartHelpers.drawRoundedRectangle(
					ctx,
					view.subLabelX, // x
					view.subLabelY, // y
					view.subLabelWidth, // width
					view.subLabelHeight, // height
					view.subLabelCornerRadius // radius
				);
				ctx.fill();

				// Draw the text
				ctx.font = chartHelpers.fontString(
					view.subLabelFontSize,
					view.subLabelFontStyle,
					view.subLabelFontFamily
				);
				ctx.fillStyle = view.subLabelFontColor;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(
					view.sublLabelTitle,
					view.subLabelX + (view.subLabelWidth / 2),
					view.subLabelY + (view.subLabelHeight / 2) - view.sublLabelLineHeight * 0.7
				);

                ctx.fillStyle = view.subLabelSecondaryFontColor;
				ctx.fillText(
					view.sublLabelLabel,
					view.subLabelX + (view.subLabelWidth / 2),
					view.subLabelY + (view.subLabelHeight / 2) + view.sublLabelLineHeight  * 1.2
				);
			}

			ctx.restore();
		}
	});

	return LineAnnotation;
};

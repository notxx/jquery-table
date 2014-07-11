(function($) {

var methods = {};
methods.init = function(options) {
	var table = this;
	if (table.data("table.options")) { return; }
	if (typeof options === "object")
		options = $.extend({}, defaults, options);
	else
		options = $.extend({}, defaults);
	options.custom = $.extend({}, defaults.custom, options.custom);
	options.sort = $.extend({}, defaults.sort, options.sort);
	this.data("table.options", options);
	
	if (typeof options.source === "string") { // 数据源是字符串
	} else if ($.isArray(options.source)) { // 数据源是数组
	} else if ($.isFunction(options.source)) { // 数据源是函数
	} else {
		return false;
	}

	if (!options.rows) {
		var rows = options.rows = [];
		table.find("thead tr").each(function(i) {
			var columns = [], tr = $(this);
			tr.children().each(function(j) {
//				console.log(this);
				var td = $(this);
				if (!td.is("td") && !td.is("th")) { return; }
				var prop = {}; // 复制单元格的一些属性
				var pn = prop["data-property"] = td.attr("data-property");
				prop.colspan = td.attr("colspan");
				prop.rowspan = td.attr("rowspan");
				prop.width = td.attr("width");
				columns.push(prop);
				if (options.sort[pn]) {
					var a = $("<a href='javascript:void(0)' class='sort'>"),
						contents = td.contents(), icon = $("<span class='ui-icon ui-icon-triangle-2-n-s'>");
					td.append(a.append(icon).append(contents));
					a.data("icon", icon)
					.data("sort", { field: pn, order: "neutral" })
					.click(function() {
						var a = $(this), sort = a.data("sort");
						switch (sort.order) {
						case 1:
							sort.order = -1;
							break;
						case -1:
							sort.order = 0;
							break;
						case 0:
						default:
							sort.order = 1;
							break;
						}
						table.table("sort", sort);
					});
				}
			});
			rows.push(columns);
		});
	}

	table.addClass("ui-table").on("sort", function(e, data) {
		table.find("a.sort").each(function() {
			var a = $(this), icon = a.data("icon"), sort = a.data("sort");
			//console.log(data, a.data("sort"));
			if (data.field === sort.field) {
				switch (data.order) {
				case 1:
					icon.attr("class", "ui-icon ui-icon-triangle-1-n");
					break;
				case -1:
					icon.attr("class", "ui-icon ui-icon-triangle-1-s");
					break;
				case 0:
				default:
					icon.attr("class", "ui-icon ui-icon-triangle-2-n-s");
					break;
				}
			} else {
				sort.order = 0;
				icon.attr("class", "ui-icon ui-icon-triangle-2-n-s");
			}
		});
	}).table("load");
};
methods.options = function() {
	var table = this, options = table.data("table.options");
	if (arguments.length == 0) {
		return options;
	} else if (arguments.length == 1 && $.isPlainObject(arguments[0])) {
		options = $.extend({}, options, arguments[0]);
		table.data("table.options", options);
		return this;
	} else if (arguments.length == 2 && typeof arguments[0] === "string") {
		var name = arguments[0], value = arguments[1];
		if ($.isPlainObject(value)) {
			value = $.extend({}, _eval(options, name), value);
		}
		with (options) {
			eval("name=value");
		}
		return this;
	}
}
methods.load = function() {
	var table = this, options = table.data("table.options"), 
		tbody = table.find("tbody"), cache = table.data("table.cache");
	if (typeof options.source === "string") { // 数据源是字符串
		$.ajax(options.source, {
			method : options.requestMethod || "post",
			dataType: options.requestDataType || "json",
			data: options.requestData || {}
		}).done(function(data) {
			table.data("table.cache", null);
			tbody.empty();
			if ($.isFunction(options.responseData))
				data = options.responseData(data);
			table.table("draw", data).trigger("done");
		});
	} else if ($.isArray(options.source)) { // 数据源是数组
		table.data("table.cache", null);
		tbody.empty();
		table.table("draw", options.source).trigger("done");
	} else if ($.isFunction(options.source)) { // 数据源是函数
		table.data("table.cache", null);
		tbody.empty();
		table.table("draw", options.source()).trigger("done");
	}
};
methods.sort = function(sort) {
	var table = this, options = table.data("table.options");
	options.sorting = sort;
	table.table("draw").trigger("sort", sort);
};
methods.drawRows = function(row, rowIndex) {
	var table = this, options = table.data("table.options"), result = [];
	$(options.rows).each(function() {
		var _row = this, tr = $.isFunction(options.tr) ? options.tr(_row) : $("<tr>");
		tr.addClass("ui-state-default");
		if (options.active(row)) { tr.addClass("ui-state-active"); }
		if (options.highlight(row)) { tr.addClass("ui-state-highlight"); }
		$(_row).each(function () {
			var _column = this["data-property"], extra = $.extend({}, this);
			var val;
			if ($.isFunction(options.custom[_column])) {
				val = options.custom[_column].apply(tr, [ row, extra, rowIndex ]);
			} else {
				val = _eval(row, _column);
			}
			if (!val) { // 没有值
				$("<td>", extra).addClass(_column).text("").appendTo(tr);
			} else if (!$.isFunction(val.is)) { // 基本值
				$("<td>", extra).addClass(_column).text(val.toString()).appendTo(tr);
			} else if (val.is("td")) { // 直接产生单元格
				tr.append(val.addClass(_column))
			} else { // 其他
				$("<td>", extra).addClass(_column).append(val).appendTo(tr);
			}
		});
		result.push(tr);
	});
	return result;
}
methods.draw = function(data) {
	var table = this, options = table.data("table.options"), 
		tbody = table.find("tbody"), cache = table.data("table.cache");
	if (!cache) { // no existing cache
		if (!data) { return false; }
		tbody = tbody.empty();
		cache = [];
		table.data("table.cache", cache);
		$(data).each(function(i) {
			var rows = table.table("drawRows", this, i);
			cache.push({ data: this, rows: rows });
		});
	}
	if (options.sorting) {
		cache = _sort(cache.slice(), options.sorting.field, options.sorting.order, options);
	}
	$(cache).each(function(i) {
		var filtered = $.isFunction(options.filter) ? options.filter(this.data) : true;
		$(this.rows).each(function() { $(this).css("display", filtered ? "" : "none"); });
		tbody.append.apply(tbody, this.rows);
	});
	if (options.scrollIntoView) {
		var rows = $(options.scrollIntoView, table);
		if (rows.length) { rows[0].scrollIntoView(); }
	}
	return this;
};

function _eval(context, field) {
	with (context) {
		try {
			return eval("(" + field + ")");
		} catch (e) {}
	}
}
function _sort(cache, field, order, options) {
	var func = options.sort[options.sorting.field];
	if ($.isFunction(func))
		return func(cache, options.sorting.field, options.sorting.order);
	else if (typeof func === "string")
		return options.defaultSort(cache, func, options.sorting.order); // using replacement field
	else
		return options.defaultSort(cache, options.sorting.field, options.sorting.order);
}

var defaults = {
	custom: {
		"@index": function(row, extra, i) { return (this.hasClass("ui-state-active")) ? ">" : (i + 1); }
	},
	filter: function(row) { return true; },
	active: function(row) { return false; },
	highlight: function(row) { return false; },
	defaultSort: function(cache, field, order) {
		return !!order ? cache.sort(function(a, b) {
			var _a = _eval(a.data, field), _b = _eval(b.data, field);
			if (typeof _a === "undefined" || typeof _a === "null") { _a = ""; } // "" 可以排序
			if (typeof _b === "undefined" || typeof _b === "null") { _b = ""; } // "" 可以排序
			if ($.isNumeric(_a) && $.isNumeric(_b))
				return (_a - _b) * order;
			else if (String.prototype.localeCompare)
				return String.prototype.localeCompare.apply(_a, [ _b ]) * order;
			else if (_a < b)
				return -1 * order;
			else if (_a > _b)
				return 1 * order;
			else
				return 0;
		}) : cache;
	},
	scrollIntoView: false
};

$.fn.table = function(method) {
	if(!this.is("table")) return this;  // stop here if the form does not exist

	if (typeof(method) == 'string' && method.charAt(0) != '_' && methods[method]) {
		return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
	} else if (typeof method == 'object' || !method) {

		// default constructor with or without arguments
		methods.init.apply(this, arguments);
	} else {
		$.error('Method ' + method + ' does not exist in jQuery.table');
	}
	return this;
};

$.table = {};
$.table.date_n_ip = function(row, extra) {
	var field = extra["data-property"];
	if (row[field]) { // date & IP
		var td = $("<td>");
		if (row[field].IP)
			td.addClass("X-Real-IP").attr("title", row[field].IP).tooltip();
		if (row[field].date && typeof row[field].date.date === "number") {
			var date = new Date(row[field].date.date);
			if ($.fn.timeago)
				td.append($("<time>").addClass("timeago").attr("datetime", date.toISOString()).timeago());
			else
				td.text(date.toLocaleString());
		} else {
			td.text("??");
		}
		return td;
	} else {
		return $("<td>").text("??");
	}
};

})(jQuery);

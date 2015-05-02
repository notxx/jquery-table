(function($) {
var _const = {
	options: "table.options",
	data: "table.data",
	cache: "table.cache"
};
var _events = {
	draw: "uitable-draw",
	drawend: "uitable-drawend",
	done: "done" // TODO
};
var methods = {};
methods.init = function(options) { // 初始化
	var table = this;
	if (table.data(_const.options)) { return; }
	if (typeof options === "object")
		options = $.extend({}, defaults, options);
	else
		options = $.extend({}, defaults);
	options.custom = $.extend({}, defaults.custom, options.custom);
	options.sort = $.extend({}, defaults.sort, options.sort);
	this.data(_const.options, options);

	if (options.source === "virtual") { // 虚拟数据源，即手工敲入行
	} else if (typeof options.source === "string") { // 数据源是字符串
	} else if ($.isArray(options.source)) { // 数据源是数组
	} else if ($.isFunction(options.source)) { // 数据源是函数
	} else {
		return false;
	}

	if (!options.rows) { // 没有指定行绘制方式就自动通过表格产生
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
				if (options.sort[pn]) { // 产生排序按钮
					var a = $("<a href='javascript:void(0)' class='sort'>"),
						contents = td.contents(), icon = $("<span class='ui-icon ui-icon-triangle-2-n-s'>");
					td.append(a.append(icon).append(contents));
					a.data("icon", icon)
					.data("sort", { field: pn, order: 0 })
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

	table.table("link", _events.drawend, _events.done).addClass("ui-table").on("sort", function(e, data) {
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
methods.options = function() { // 存取选项
	var table = this, options = table.data(_const.options);
	if (arguments.length == 0) {
		return options;
	} else if (arguments.length == 1 && $.isPlainObject(arguments[0])) {
		options = $.extend({}, options, arguments[0]);
		table.data(_const.options, options);
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
methods.link = function(event1, event2) { // link two events
	var table = this, options = table.data(_const.options),
		tbody = table.find("tbody"), cache = table.data(_const.cache);
	table.on(event1, function() {
		window.setTimeout(function() {
			table.trigger(event2);
		}, 0);
	});
	return this;
}
methods.load = function() { // 载入数据
	var table = this, options = table.data(_const.options),
		tbody = table.find("tbody"), cache = table.data(_const.cache);
	var data = $.isFunction(options.requestData)
			? options.requestData({ skip: 0, limit: options.limit })
			: options.requestData;
	table.data(_const.cache, null);
	if (options.source === "virtual") { // 虚拟数据源
		throw new Error("invalid operation 'load()' on virtual mode")
	} else if (typeof options.source === "string") { // 数据源是字符串
		$.ajax(options.source, {
			method : options.requestMethod || "post",
			dataType: options.requestDataType || "json",
			data: data || { skip: 0, limit: options.limit }
		}).done(function(data) {
			if ($.isFunction(options.responseData))
				data = options.responseData(data);
			table.table("consume", data);
		});
	} else if ($.isArray(options.source)) { // 数据源是数组
		table.table("consume", options.source);
	} else if ($.isFunction(options.source)) { // 数据源是函数
		table.table("consume", options.source(data));
	}
	return this;
};
methods.more = function() { // 载入数据
	var table = this, options = table.data(_const.options),
		tbody = table.find("tbody"), cache = table.data(_const.cache);
	var data = $.isFunction(options.requestData)
			? options.requestData({ skip: cache.next, limit: options.limit })
			: options.requestData;
	if (options.source === "virtual") { // 虚拟数据源
		throw new Error("invalid operation 'more()' on virtual mode")
	} else if (typeof options.source === "string") { // 数据源是字符串
		if (cache.loading)
			return this;
		cache.loading = true;
		var $more = table.find("caption.more");
		if ($more.length)
			$more.empty().append(options.loading);
		$.ajax(options.source, {
			method : options.requestMethod || "post",
			dataType: options.requestDataType || "json",
			data: data || { skip: cache.next, limit: options.limit }
		}).done(function(data) {
			cache.loading = false;
			if ($.isFunction(options.responseData))
				data = options.responseData(data);
			table.table("consume", data);
		});
	} else if ($.isArray(options.source)) { // 数据源是数组
		throw new Error("invalid operation 'more()' on static mode")
	} else if ($.isFunction(options.source)) { // 数据源是函数
		table.table("consume", options.source(data));
	}
	return this;
};
methods.consume = function(data) { // 将数据转化到缓存
	var table = this, options = table.data(_const.options), 
		tbody = table.find("tbody"), cache = table.data(_const.cache);
	if (!data) {
		throw new Error("no data");
	} else if ($.isArray(data)) {
		data = {
			$skip: 0,
			$limit: data.length,
			$array: data,
			$count: data.length
		};
	} else if ($.isArray(data.$array)) {
		// do nothing
	} else {
		throw new Error("invalid data");
	}
	
	if (data.$skip == 0 || !cache) { // 初始化缓存，清空表格
		tbody = tbody.empty();
		cache = [];
	}
	cache.lastModified = new Date().getTime();
	cache.skip = data.$skip || 0;
	cache.next = data.$skip + data.$limit || data.$array.length;
	cache.more = cache.next < data.$count;
	table.data(_const.cache, cache);
	$.each(data.$array, function(i) { // 通过数据产生缓存
		var rows = table.table("rows", this, cache.skip + i);
		cache.push({ data: this, rows: rows });
	});
	var $more = table.find("caption.more");
	if (cache.more) {
		if (!$more.length) {
			$more = $("<caption class='more' align='bottom'>").appendTo(table)
		}
		table.one(_events.done, function() {
			$("<a href='javascript:void(0)'>").appendTo($more.empty())
			.text(cache.next + "/" + data.$count + " 载入更多")
			.click(function load_more() { table.table("more"); });
		});
	} else {
		$more.remove();
	}
	table.table("draw");
	return this;
};
methods.sort = function(sort) { // 排序缓存
	var table = this, options = table.data(_const.options);
	options.sorting = sort;
	table.table("draw").trigger("sort", sort);
};
methods.rows = function(row, rowIndex) { // 绘制一行
	var table = this, options = table.data(_const.options), result = [];
	$.each(options.rows, function() {
		var _row = this,
			tr = $.isFunction(options.tr) ? options.tr(row) 
				: $("<tr>").addClass("ui-state-default");
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
methods.insert = function(row, rowIndex) { // 插入一行到表格，仅可在虚拟数据源下使用
	var table = this, options = table.data(_const.options), 
		tbody = table.find("tbody");
	if (options.source !== "virtual") { throw new Error("options.source !== 'virtual'") }
	var rows = table.table("rows", row, rowIndex);
	tbody.append.apply(tbody, rows);
}
methods.draw = function(data) { // 将缓存绘制到表格
	var table = this, $tbody = table.find("tbody"),
		timestamp = $tbody.data("timestamp"),
		options = table.data(_const.options),
		data = table.data(_const.data),
		cache = table.data(_const.cache),
		toDraw;
	if (!cache) { // 缓存不存在
		throw new Error("no cache");
	}
	toDraw = options.sorting ?
		_sort(cache.slice(), options.sorting.field, options.sorting.order, options) : cache;
	var drawCache = [], MAX = 50, index = 0;
	$.each(toDraw, function(i) {
		var filtered = $.isFunction(options.filter) ? options.filter(this.data) : true,
			active = $.isFunction(options.active) ? options.active(this.data) : false,
			highlight = $.isFunction(options.highlight) ? options.highlight(this.data) : false;
		$.each(this.rows, function() {
			var $this = $(this).css("display", filtered ? "" : "none");
			if (active)
				$this.addClass("ui-state-active");
			else
				$this.removeClass("ui-state-active");
			if (highlight)
				$this.addClass("ui-state-highlight");
			else
				$this.removeClass("ui-state-highlight");
		});
		drawCache = drawCache.concat(this.rows);
		index += this.rows.length;
		if (drawCache.length >= MAX || i === cache.length - 1) { // 应输出
			window.setTimeout(function(rows, start) {
				if (!timestamp || timestamp !== cache.lastModified || !$tbody.children("tr").length) { // 不是排序，直接添加
					$tbody.data("timestamp", cache.lastModified);
					$.each(rows, function() { $tbody.append(this); });
				} else { // 替换
					$.each(rows, function(j) {
						var $old = $($tbody.children("tr")[start + j]);
						if (!$old.length) {
							$tbody.append(this);
						} else if ($old[0] != this[0]) {
							$old.replaceWith(this);
						}
					});
				}
				table.trigger(_events.draw);
			}, 10, drawCache, index - drawCache.length);
			drawCache = [];
		}
	});
	table.trigger(_events.drawend);
	if (options.scrollIntoView) {
		var rows = $(options.scrollIntoView, table);
		if (rows.length) { rows[0].scrollIntoView(); }
	}
	return this;
};

function _eval(context, expr) { // 对表达式求值
	with (context) {
		try {
			return eval("(" + expr + ")");
		} catch (e) {}
	}
}
function _sort(cache, field, order, options) { // 对缓存排序
	var func = options.sort[options.sorting.field]
	if ($.isFunction(func))
		return func(cache, options.sorting.field, options.sorting.order);
	else if (typeof func === "string")
		return options.defaultSort(cache, func, options.sorting.order); // using replacement field
	else
		return options.defaultSort(cache, options.sorting.field, options.sorting.order);
}

var defaults = {
	limit: 20,
	custom: {
		"@index": function(row, extra, i) { return (this.hasClass("ui-state-active")) ? ">" : (i + 1); }
	},
	loading: $("<div class='loading'>").append("<div class='one'>").append("<div class='two'>").append("<div class='three'>"),
	autoMore: "scroll",
	defaultSort: function(cache, field, order) {
		return !!order ? cache.sort(function(a, b) {
			var _a = _eval(a.data, field), _b = _eval(b.data, field);
			if (typeof _a === "undefined" || typeof _a === "null") { _a = ""; } // "" 可以排序
			if (typeof _b === "undefined" || typeof _b === "null") { _b = ""; } // "" 可以排序
			if ($.isNumeric(_a) && $.isNumeric(_b)) // 进行数值比较
				return (_a - _b) * order;
			else if (String.prototype.localeCompare) // 进行本地化字符串比较
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
	if(!this.is("table")) return this;  // stop here if the table does not exist

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
	var field = extra["data-property"], value = row[field];
	if (value) { // date & IP
		var td = $("<td>");
		if (value.IP)
			td.addClass("X-Real-IP").attr("title", value.IP).tooltip();
		if (typeof value.date === "number") {
			td.text(new Date(value.date).toLocaleDateString());
		} else if (typeof value.$date === "number") {
			var date = new Date(value.$date);
			td.text(date.toLocaleDateString());
		} else if (value.date && typeof value.date.date === "number") {
			var date = new Date(value.date.date);
			td.text(date.toLocaleDateString());
		} else {
			td.text("??");
		}
		return td;
	} else {
		return $("<td>").text("??");
	}
};

})(jQuery);

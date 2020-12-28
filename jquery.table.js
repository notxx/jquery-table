(function($) {
if (!$) { return; }

var _const = {
	options: "table.options",
	data: "table.data",
	cache: "table.cache"
};
var _events = {
	draw: "uitable-draw",
	sort: "uitable-sort",
	drawend: "uitable-drawend"
};
var methods = {};
methods.init = function(options) { // 初始化
	this.each(function() { // 对每个表格分别初始化
		var $table = $(this);
		if ($table.data(_const.options)) { return; }
		if (typeof options === "object")
			options = $.extend({}, defaults, options);
		else
			options = $.extend({}, defaults);
		options.custom = $.extend({}, defaults.custom, options.custom);
		options.sort = $.extend({}, defaults.sort, options.sort);
		$table.data(_const.options, options);

		if (options.source === "virtual") { // 虚拟数据源，即手工敲入行
		} else if (typeof options.source === "string") { // 数据源是字符串
		} else if ($.isArray(options.source)) { // 数据源是数组
		} else if ($.isFunction(options.source)) { // 数据源是函数
		} else {
			return false;
		}

		if (!options.rows) { // 没有指定行绘制方式就自动通过表格产生
			var rows = options.rows = [];
			$table.find("thead tr").each(function(i) {
				var columns = [], tr = $(this);
				tr.children().each(function(j) {
	//				console.log(this);
					var $td = $(this);
					if (!$td.is("td") && !$td.is("th")) { return; }
					var prop = {}; // 复制单元格的一些属性
					var pn = prop["data-property"] = $td.attr("data-property");
					prop.colspan = $td.attr("colspan");
					prop.rowspan = $td.attr("rowspan");
					prop.width = $td.attr("width");
					columns.push(prop);
					if (options.sort[pn]) { // 产生排序按钮
						var $a = $("<a href='javascript:void(0)' class='sort'>"),
							contents = $td.contents();
						$a.append(contents).appendTo($td)
						.data("sort", { field: pn, order: 0 })
						.click(function() {
							var $a = $(this), sort = $a.data("sort");
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
							$table.table("sort", sort);
						});
					}
				});
				rows.push(columns);
			});
		}

		$table
		.table("link", _events.drawend, "done") // TODO
		.table("link", _events.sort, "sort") // TODO
		.addClass(options.defaultClass.table)
		.on("sort", function(e, data) {
			$table.find("a.sort").each(function() { // 维护排序图标
				// TODO 1 放弃jquery-ui的图标，可以考虑使用bootstrap的图标字
				// TODO 2 考虑transition展示图标从正序到逆序的效果
				var $a = $(this), sort = $a.data("sort");
				//console.log(data, $a.data("sort"));
				if (data.field === sort.field) {
					switch (data.order) {
					case 1:
						$a.attr("class", "sort sort-asc");
						break;
					case -1:
						$a.attr("class", "sort sort-desc");
						break;
					case 0:
					default:
						$a.attr("class", "sort");
						break;
					}
				} else {
					sort.order = 0;
					$a.attr("class", "sort");
				}
			});
		}).table("load");
	});
};
methods.options = function table_options() { // 存取选项
	var table = this, options = table.data(_const.options);
	if (arguments.length == 0) { // 获取选项
		return options;
	} else if (arguments.length == 1 && $.isPlainObject(arguments[0])) { // 设置选项
		options = $.extend({}, options, arguments[0]);
		table.data(_const.options, options);
		return this;
	} else if (arguments.length == 1 && typeof arguments[0] === "string") { // 获取一项选项
		return _eval_get(options, arguments[0]);
	} else if (arguments.length == 2 && typeof arguments[0] === "string") { // 设置一项选项
		_eval_set(options, arguments[0], arguments[1]);
		return this;
	}
}
methods.link = function table_link(event1, event2) { // link two events
	var table = this, options = table.data(_const.options),
		tbody = table.find("tbody"), cache = table.data(_const.cache);
	table.on(event1, function() {
		window.setTimeout(function() {
			table.trigger(event2);
		}, 0);
	});
	return this;
}
methods.load = function table_load() { // 载入数据
	var table = this, options = table.data(_const.options),
		tbody = table.find("tbody"), cache = table.data(_const.cache);
	var data = $.isFunction(options.requestData)
			? options.requestData({ $skip: 0, $limit: options.limit })
			: options.requestData;
	table.data(_const.cache, null);
	if (options.source === "virtual") { // 虚拟数据源
		throw new Error("invalid operation 'load()' on virtual mode")
	} else if (typeof options.source === "string") { // 数据源是字符串
		$.ajax(options.source, {
			method : options.requestMethod || "post",
			dataType: options.requestDataType || "json",
			data: data || { $skip: 0, $limit: options.limit }
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
methods.more = function table_more() { // 载入数据
	var table = this, options = table.data(_const.options),
		tbody = table.find("tbody"), cache = table.data(_const.cache);
	var data = $.isFunction(options.requestData)
			? options.requestData({ $skip: cache.next, $limit: options.limit })
			: options.requestData,
		$more = table.find("caption.more");
	if (options.source === "virtual") { // 虚拟数据源
		throw new Error("invalid operation 'more()' on virtual mode")
	} else if ($.isArray(options.source)) { // 数据源是数组
		throw new Error("invalid operation 'more()' on static mode")
	} else if (typeof options.source === "string") { // 数据源是字符串
		if (cache.loading)
			return this;
		cache.loading = true;
		if ($more.length)
			$more.empty().append(options.loading);
		$.ajax(options.source, {
			method : options.requestMethod || "post",
			dataType: options.requestDataType || "json",
			data: data || { $skip: cache.next, $limit: options.limit }
		}).done(function(responseData) {
			cache.loading = false;
			if ($.isFunction(options.responseData))
				responseData = options.responseData(responseData);
			table.table("consume", responseData);
		});
	} else if ($.isFunction(options.source)) { // 数据源是函数
		if (cache.loading)
			return this;
		cache.loading = true;
		if ($more.length)
			$more.empty().append(options.loading);
		window.setTimeout(function() {
			cache.loading = false;
			var responseData = options.source(data);
			if ($.isFunction(options.responseData))
				responseData = options.responseData(responseData);
			table.table("consume", responseData);
		}, 1500);
	}
	return this;
};
methods.consume = function table_consume(data) { // 将数据转化到缓存
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
			$more = $("<caption class='more' align='bottom'>").appendTo(table);
		}
		table.one(_events.drawend, function() {
			$("<a href='javascript:void(0)'>").appendTo($more.empty())
			.text(cache.next + "/" + data.$count + " 载入更多")
			.click(function table_more() { table.table("more"); });
		});
	} else {
		$more.remove();
	}
	table.table("draw");
	return this;
};
methods.sort = function table_sort(sort) { // 重新排序
	var table = this, options = table.data(_const.options);
	options.sorting = sort;
	table.table("draw").trigger("sort", sort);
};
methods.rows = function table_rows(row, rowIndex) { // 绘制一行
	var table = this, options = table.data(_const.options), result = [];
	$.each(options.rows, function() {
		var _row = this,
			$tr = ($.isFunction(options.tr) ? options.tr(row) 
				: $("<tr>")).addClass(options.defaultClass.row),
			cells = [];
		$(_row).each(function () {
			var _column = this["data-property"], extra = $.extend({}, this), $td;
			var val;
			if ($.isFunction(options.custom[_column])) { // 自定义单元格生成者
				val = options.custom[_column].apply($tr, [ row, extra, rowIndex ]);
			}
			else {
				val = _eval_get(row, _column);
			}
			if (typeof val !== "number" && !val) { // 没有值
				$td = $("<td>", extra).addClass(_column).text("");
			}
			else if (!$.isFunction(val.is)) { // 基本值
				$td = $("<td>", extra).addClass(_column).text(val.toString());
			}
			else if (val.is("td")) { // 直接产生单元格
				$td = val.addClass(_column);
			}
			else { // 其他
				$td = $("<td>", extra).addClass(_column).append(val);
			}
			cells.push($td);
		});
		$tr.append(cells);
		result.push($tr);
	});
	return result;
}
methods.insert = function table_insert(row, rowIndex) { // 插入一行到表格，仅可在虚拟数据源下使用
	var table = this, options = table.data(_const.options), 
		tbody = table.find("tbody");
	if (options.source !== "virtual") { throw new Error("options.source !== 'virtual'") }
	var rows = table.table("rows", row, rowIndex);
	tbody.append.apply(tbody, rows);
}
methods.draw = function table_draw(data) { // 将缓存绘制到表格
	var table = this, $tbody = table.find("tbody"),
		timestamp = $tbody.data("timestamp"),
		options = table.data(_const.options),
		data = table.data(_const.data),
		cache = table.data(_const.cache),
		toDraw;
	if (!cache) { // 缓存不存在
		throw new Error("no cache");
	}
	toDraw = cache.slice();
	if (options.sorting) {
		_sort(toDraw, options.sorting.field, options.sorting.order, options);
	}
	var drawCache = [], MAX = 50, index = 0, intact = true;
	$.each(toDraw, function(i) {
		var $row = this.rows[0], $old = $tbody.children("tr");
		if (intact && $old.length && $old[index] === $row[0]) {
			return index += this.rows.length;
		}
		intact = false;
		var filter = $.isFunction(options.filter),
			hasRowClass = $.isFunction(options.rowClass);
		if (filter || hasRowClass) { // 应用选项中的动态过滤/动态类
			var filtered = filter ? options.filter(this.data) : true,
				rowClass = hasRowClass ? options.rowClass(this.data) : false;
			$.each(this.rows, function() {
				var $row = $(this).css("display", filtered ? "" : "none");
				if (rowClass) { $row.attr("class", rowClass); }
				$row.addClass(options.defaultClass.row);
			});
		}
		drawCache = drawCache.concat(this.rows);
		index += this.rows.length;
		if (drawCache.length >= MAX || i === cache.length - 1) { // 应输出
			$tbody.append(drawCache);
			drawCache = [];
			table.trigger(_events.draw);
		}
	});
	table.trigger(_events.drawend);
	if (options.scrollIntoView) {
		var rows = $(options.scrollIntoView, table);
		if (rows.length) { rows[0].scrollIntoView(); }
	}
	return this;
};

function _try() {
	var args = Array.prototype.slice.apply(arguments), // 复制参数
		func = args.shift(); // 抽掉第一个参数
	try {
		return func.apply(this, args);
	} catch (e) {}
}
var _eval_get_cache = {}; // 表达式缓存
function _eval_get(context, expr) { // 对表达式求值
	var _cache = _eval_get_cache;
	if (_cache[expr]) { return _try.apply(context, [ _cache[expr] ]); }
	var func, index = expr.indexOf(".");
	if (index == 0) { // 点（.）开头的表达式
		func = new Function("return this" + expr);
	}
	else if (index > 0) { // 含有点（.）的表达式
		func = new Function("return this." + expr);
	}
	else { // 其他表达式
		func = function() { return this[expr]; }
	}
	_cache[expr] = func; // 缓存函数
	return _try.apply(context, [ func ]);
}
var _eval_set_cache = {}; // 表达式缓存
function _eval_set(context, expr, value) { // 对表达式求值
	var _cache = _eval_set_cache;
	if (_cache[expr]) { return _try.apply(context, [ _cache[expr], value ]); }
	var func, index = expr.indexOf(".");
	if (index == 0) { // 点（.）开头的表达式
		func = new Function("value", "this" + expr + " = value");
	}
	else if (index > 0) { // 含有点（.）的表达式
		func = new Function("value", "this." + expr + " = value");
	}
	else { // 其他表达式
		func = function(value) { return this[expr] = value; }
	}
	_cache[expr] = func; // 缓存函数
	return _try.apply(context, [ func, value ]);
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
	limit: 20, // 分页
	localSort: true, // 本地排序
	custom: { // 自定义生成单元格
		"@index": function(row, extra, i) { return (i + 1); }
	},
	loading: $("<div class='loading'>"),
	autoMore: "scroll", // 自动载入更多
	defaultClass: { // 默认CSS类
		table: "ui-table table table-striped table-bordered table-hover table-condensed",
		row: ""
	},
	defaultSort: function table_sort(cache, field, order) { // 排序函数
		return !!order ? cache.sort(function(a, b) {
			var _a = _eval_get(a.data, field), _b = _eval_get(b.data, field);
			if (typeof _a === "undefined" || _a === "null") { _a = ""; } // "" 可以排序
			if (typeof _b === "undefined" || _b === "null") { _b = ""; } // "" 可以排序
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
	if(!this.is("table")) {  // stop here if the table does not exist
		console.warn("host not table");
		return this;
	}

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
$.table.date = function(row, extra) { // 输出日期
	var field = extra["data-property"], value = row[field];
	if (value) { // date
		var $td = $("<td>"), date = null;
		if (typeof value.date === "number") {
			date = new Date(value.date);
		} else if (typeof value.$date === "number") {
			date = new Date(value.$date);
		} else if (value.date && typeof value.date.date === "number") {
			date = new Date(value.date.date);
		}
		if (date) {
			$td.text(date.toLocaleDateString());
		} else {
			$td.text("??");
		}
		return $td;
	} else {
		return $("<td>").text("??");
	}
};
$.table.date_n_ip = function(row, extra) { // 输出日期和IP
	var field = extra["data-property"], value = row[field];
	if (value) { // date & IP
		var $td = $("<td>"), date = null;
		if (value.IP)
			$td.addClass("X-Real-IP").attr("title", value.IP).tooltip();
		if (typeof value.date === "number") {
			date = new Date(value.date);
		} else if (typeof value.$date === "number") {
			date = new Date(value.$date);
		} else if (value.date && typeof value.date.date === "number") {
			date = new Date(value.date.date);
		}
		if (date) {
			$td.text(date.toLocaleDateString());
		} else {
			$td.text("??");
		}
		return $td;
	} else {
		return $("<td>").text("??");
	}
};
$.table.moment_v2 = function(format) { // 以moment()的方式输出日期
	return (function(row, extra) {
		if (!$.isFunction(moment)) { return; }
		var field = extra["data-property"], value = row[field];
		return moment(value.$date).format(format);
	});
};
$.table.moment = $.table.moment_v2("YYYY-MM-DD HH:mm");
$.table.hover = function(options) { // 鼠标悬停显示按钮
	return (function(row, extras) {
		var $td = $('<td class="need-hover">'),
			$group = $('<div class="hover">').appendTo($td),
			$text = $('<font class="text">').appendTo($td);

		// 单元格内容
		var field = options.field || extras["data-property"],
			text = $.isFunction(options.text) ? options.text(row, extras) : options.text;
		if ($.isFunction(options.content)) {
			$text.append(options.content(row, extras));
		} else if (text) {
			$text.text(text);
		} else {
			val = _eval_get(row, field);
			$text.text(val);
		}

		// 按钮分组
		var group = $.isFunction(options.group) ? options.group(row, extras) : options.group;
		if (group) { $group.addClass("btn-group"); }
		// 按钮内容
		var buttons = $.isFunction(options.buttons) ? options.buttons(row, extras) : options.buttons;
		$.each(buttons || [], function(i, button) {
			var $btn = $('<a class="btn btn-xs">', button.extras || {}).appendTo($group),
				content = $.isFunction(button.content) ? button.content(row, extras) : button.content,
				text = $.isFunction(button.text) ? button.text(row, extras) : button.text;
			if (content) {
				$btn.append(content);
			} else {
				$btn.text(text);
			}
			if ($.isFunction(button.href)) {
				$btn.attr("href", button.href(row, extras));
			} else if (button.href) {
				$btn.attr("href", button.href);
			} else if ($.isFunction(button.click)) {
				$btn.attr("href", "javascript:void(0)").click(function(e) { button.click(e, row, extras); });
			}
			var clazz = $.isFunction(button.class) ? button.class(i, button, row, extras) : button.class;
			if (clazz) { $btn.addClass(clazz); }
		});

		var tid;
		$td.hover(function() {
			if (tid) window.clearTimeout(tid);
			$td.addClass("hover");
		}, function() {
			if (!$group.hasClass("open")) { return $td.removeClass("hover"); }
			tid = window.setTimeout(function() { // 菜单已打开则延时关闭
				$group.removeClass("open");
				$td.removeClass("hover");
			}, 500);
		});
		return $td;
	});
};
$.table.enum = function(options) { // 枚举显示
	return (function(row, extra) {
		var val = row[extra["data-property"]];
		return typeof(options[val]) === "string" ? options[val] : ("??" + val + "??");
	});
};
$.table.overflow = function(options) { // 鼠标悬停显示溢出
	options = options || {};
	return (function(row, extras) {
		var $td = $('<td class="overflow">'),
			$text = $('<div class="text">').appendTo($td);

		// 单元格内容
		var field = options.field || extras["data-property"],
			text = $.isFunction(options.text) ? options.text(row, extras) : options.text;
		if ($.isFunction(options.content)) {
			$text.append(options.content(row, extras));
		} else if (text) {
			$text.text(text);
		} else {
			val = _eval_get(row, field);
			$text.text(val);
		}

		$td.on("mouseenter", function() {
			$text.addClass("hover");
			if ($td.hasClass("overflowed")) return;
			var w0 = $td.width(),
				w1 = $text.width();
			if (w0 < w1) $td.addClass("overflowed");
		}).on("mouseleave", function() {
			$text.removeClass("hover");
		});
		return $td;
	});
};

})(jQuery);

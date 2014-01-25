/*
Copyright (C) 2011 Jesus Perez <jepefe@gmail.com>
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 2 of the License, or
(at your option) any later version.
 
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License at <http://www.gnu.org/licenses/>
for more details.
*/

var FX_ID = "2";	// 2 is a FX-series inverter
var CC_ID = "3";	// 3 is a FM/MX charge controller (CC)
var FNDC_ID = "4";	// 4 is a FLEXnet DC

var json_status = null;
var full_day_data;
var available_years;
var available_months = [];
var available_month_days;

var chart_content = {
	multichart1: "battery_volts",
	multichart2: "charge_current",
	multichart3: "charge_power",
};

var status_content = {
	status_top: "summary",
	status_bottom: "none",
};


function get_URLvars() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
		vars[key] = value;
	});
	return vars;
}


function set_cookies(name, value) {
	expire_date = (new Date(new Date().getFullYear() + 1, new Date().getMonth() + 1, new Date().getDate())).toGMTString();
	document.cookie = name + "=" + value + "; expires=" + expire_date;
}


function get_cookies() {
	if (document.cookie.match('(^|;) ?' + "multichart1" + '=([^;]*)(;|$)')) chart_content["multichart1"] = unescape(document.cookie.match('(^|;) ?' + "multichart1" + '=([^;]*)(;|$)')[2]);
	if (document.cookie.match('(^|;) ?' + "multichart2" + '=([^;]*)(;|$)')) chart_content["multichart2"] = unescape(document.cookie.match('(^|;) ?' + "multichart2" + '=([^;]*)(;|$)')[2]);
	if (document.cookie.match('(^|;) ?' + "multichart3" + '=([^;]*)(;|$)')) chart_content["multichart3"] = unescape(document.cookie.match('(^|;) ?' + "multichart3" + '=([^;]*)(;|$)')[2]);
	if (document.cookie.match('(^|;) ?' + "status_top" + '=([^;]*)(;|$)')) status_content["status_top"] = unescape(document.cookie.match('(^|;) ?' + "status_top" + '=([^;]*)(;|$)')[2]);
	if (document.cookie.match('(^|;) ?' + "status_bottom" + '=([^;]*)(;|$)')) status_content["status_bottom"] = unescape(document.cookie.match('(^|;) ?' + "status_bottom" + '=([^;]*)(;|$)')[2]);
}

function get_day(date) {
	var chart_data;

	if (!date) {
		date = get_formatted_date();
	}

	$.ajax({
		async: false,
		type: 'GET',
		dataType: 'json',
		url: 'getstatus.php?q=day&date=' + date,
		success: function (data) {
			full_day_data = data;
		}
	});

}

function get_days_in_month(year, month) {
	// makes a date object for *next* month...
	// subtracks a single second (to make it the last second of the previous day)
	// gets the day of *that* month
	// now return that, which is the number of days in that month!
	return (new Date((new Date(year, month + 1, 1)) - 1)).getDate();
}


function get_formatted_date(date) {
	if (!date) {
		d = new Date();
	} else {
		d = new Date(date)
	}
	var day = d.getDate();
	var month = d.getMonth() + 1;
	var year = d.getFullYear();
	date = year + "-" + month + "-" + day;
	return date;
}

// not currently using this...
function round_decimals(number, places) {
    placeholder = number * Math.pow(10,places);
	placeholder = Math.round(placeholder);
	rounded = placeholder / Math.pow(10,places);
	return rounded;
}


/*
	Put the items in the pop-up selection menu for the charts 
*/
function populate_select(pselect) {
	var select_items = [];

	if (full_day_data[4]) { /* FlexNet available */
		for (i in full_day_data[4]) {
			select_items.push('<option value="flexnet_soc">State of Charge</option>');
			select_items.push('<option value="flexnet_shunts">Shunts Current</option>');
		}
	}

	if (full_day_data[3]) { /* FM/MX charge controller available */
		select_items.push('<option value="charge_power">PV Output Power</option>');
		select_items.push('<option value="charge_current">PV Output Current</option>');
		select_items.push('<option value="array_volts">PV Array Voltage</option>');
		select_items.push('<option value="array_current">PV Array Current</option>');
		select_items.push('<option value="battery_volts">Battery Voltage</option>');		
	}

	$('#' + pselect).html(select_items.join(''));
}


/*
	Put the items in the pop-up selection menu for the status sidebar 
*/
function populate_status() {
	var tabs = [];

	// i is the ID
	for (var i in full_day_data) {
		if (i == "summary") {
			name = "Summary";
			val = "summary";
			//tabs.push("<option value=" + val + ">" + name + "</option>");
			tabs.splice(0, 0, "<option value=" + val + ">" + name + "</option>");
			tabs.splice(1, 0, '<optgroup label="Devices">');
		} else {
			// j is the port number
			for (var j in full_day_data[i]) {
				var name = '';
				var val = '';


				if (deviceLabel[j] != "") {
					// Assign name from cfg file
					name = deviceLabel[j];
				} else {
					// Assign default name based on ID type 
					//	2 is an inverter (FX)
					//	3 is a Charge Controller (FM/MX)
					//	4 is a FLEXnet DC
					switch (i) {
					case FX_ID:
						name = "FX Inverter - Port " + full_day_data[i][j][0].address;
						break;
					case CC_ID:
						name = "FM/MX - Port " + full_day_data[i][j][0].address;
						break;
					case FNDC_ID:
						name = "FLEXnet DC - Port " + full_day_data[i][j][0].address;
						break;
					}
				}
				val = i + ":" + j;
				tabs.push("<option value=" + val + ">" + name + "</option>");
			}
		}
	}
	tabs.push("</optgroup>");
	
	$("#status_top_select").html(tabs.join(''));
	$("#status_bottom_select").html(tabs.join(''));
}


function set_status(div, value) {
	var data = '';
	var device_id;
	var address;
	var device;
	var value = value;
	var div = div;
	
	// TODO: I hate the use of "value", don't all variables have a value??
	
	if (value == "none") {
		for (var i in json_status) {
			switch (json_status[i].device_id) {
				case DEVICE["CC"]:
					value = json_status[i].device_id + ":" + Math.round(json_status[i].address);
					break;
			}
		}
	}

	if (value != "summary") {
		device_id = value.split(/[:]/)[0];
		address = value.split(/[:]/)[1];
		device = json_status["device" + address];
	} else {
		device_id = "summary"
		address = "summary"
		device = full_day_data["summary"];
	}

	var content = '';
	switch (device_id) {

		case "summary":
			content =	'<table><caption>Summary<div>' + device.date + '</div></caption>\
						<tr><td class="label">kWh In:</td><td>' + device.kwh_in + ' kWh</td></tr>\
						<tr><td class="label">kWh Out:</td><td>' + device.kwh_out + ' kWh</td></tr>\
						<tr><td class="label">Ah In:</td><td>' + device.ah_in + ' Ah</td></tr>\
						<tr><td class="label">Ah Out:</td><td>' + device.ah_out + ' Ah</td></tr>\
						<tr><td class="label">Max SOC:</td><td>' + device.max_soc + ' %</td></tr>\
						<tr><td class="label">Min SOC:</td><td>' + device.min_soc + ' %</td></tr>\
						<tr><td class="label">Max Temp:</td><td>' + device.max_temp + ' &deg;C (' + ((device.max_temp * 1.8) + 32).toFixed(1) + ' &deg;F)</td></tr>\
						<tr><td class="label">Min Temp:</td><td>' + device.min_temp + ' &deg;C (' + ((device.min_temp * 1.8) + 32).toFixed(1) + ' &deg;F)</td></tr>\
						<tr><td class="label">Max PV Voltage:</td><td>' + device.max_pv_voltage + ' V</td></tr>\
						</table>';
			break;

		case FX_ID:
			content =	'<table><caption>FX Inverter<div>Port ' + device.address + '</div></caption>\
						<tr><td class="label">AC Output Voltage:</td><td>' + device.ac_output_voltage + ' V</td></tr>\
						<tr><td class="label">Inverter Current:</td><td>' + device.inverter_current + ' A</td></tr>\
						<tr><td class="label">Charge Current:</td><td>' + device.charge_current + ' A</td></tr>\
						<tr><td class="label">AC Input Voltage:</td><td>' + device.ac_input_voltage + ' V</td></tr>\
						<tr><td class="label">Buy Current:</td><td>' + device.buy_current + ' A</td></tr>\
						<tr><td class="label">Sell Current:</td><td>' + device.sell_current + ' A</td></tr>\
						<tr><td class="label">AC Mode:</td><td>' + device.ac_mode + '</td></tr>\
						<tr><td class="label">Operational Mode:</td><td>' + device.operational_mode + '</td></tr>\
						<tr><td class="label">Error Modes:</td><td>' + device.error_modes + '</td></tr>\
						<tr><td class="label">Warning Modes:</td><td>' + device.warning_modes + '</td></tr>\
						<tr><td class="label">Misc:</td><td>' + device.misc + '</td></tr>\
						</table>';
			break;

		case CC_ID:
			content =	'<table><caption>FX/MX Charge Controller<div>Port ' + device.address + '</div></caption>\
						<tr><td class="label">Charge Current:</td><td>' + device.charge_current + ' A</td></tr>\
						<tr><td class="label">Charge Mode:</td><td>' + device.charge_mode + '</td></tr>\
						<tr><td class="label">PV Current:</td><td>' + device.pv_current + ' A</td></tr>\
						<tr><td class="label">PV Voltage:</td><td>' + device.pv_voltage + ' V</td></tr>\
						<tr><td class="label">Daily kWh:</td><td>' + device.daily_kwh + ' kWh</td></tr>\
						<tr><td class="label">Daily Ah:</td><td>' + device.daily_ah + ' Ah</td></tr>\
						<tr><td class="label">Battery Voltage:</td><td>' + device.battery_volts + ' V</td></tr>\
						<tr><td class="label">Error Modes:</td><td>' + device.error_modes + '</td></tr>\
						<tr><td class="label">Aux Mode:</td><td>' + device.aux_mode + '</td></tr>\
						</table>';
			break;

		case FNDC_ID:
			content =	'<table><caption>FLEXnet DC<div>Port ' + device.address + '</div></caption>\
						<tr><td class="label">SOC:</td><td>' + device.soc + '%</td></tr>\
						<tr><td class="label">Battery Voltage:</td><td>' + device.battery_volt + ' V</td></tr>\
						<tr><td class="label">Battery Temperature:</td><td>' + device.battery_temp + ' &deg;C (' + ((device.battery_temp * 1.8) + 32).toFixed(1) + ' &deg;F)</td></tr>\
						<tr><td class="label">Charge Parameters Met:</td><td>' + device.charge_params_met + '</td></tr>\
						<tr><td class="label">Days Since Full:</td><td>' + (Math.round(device.days_since_full * 100) / 100) + ' Days</td></tr>\
						<tr><td class="label">Charge Corrected Net:</td><td>' + device.charge_factor_corrected_net_batt_ah + ' Ah, ' + device.charge_factor_corrected_net_batt_kwh + ' kWh</td></tr>\
						<tr><td class="label">Relay Mode:</td><td>' + device.relay_mode + '</td></tr>\
						<tr><td class="label">Relay Status:</td><td>' + device.relay_status + '</td></tr>\
						<th class="subhead">Shunts</th>\
						<tr><td class="label">' + shuntLabel[1] + ':</td><td>' + device.shunt_a_amps + ' A, ' + Math.round(device.shunt_a_amps * device.battery_volt) + ' W</td></tr>\
						<tr><td class="label">' + shuntLabel[2] + ':</td><td>' + device.shunt_b_amps + ' A, ' + Math.round(device.shunt_b_amps * device.battery_volt) + ' W</td></tr>\
						<tr><td class="label">' + shuntLabel[3] + ':</td><td>' + device.shunt_c_amps + ' A, ' + Math.round(device.shunt_c_amps * device.battery_volt) + ' W</td></tr>\
						<th class="subhead">Today\'s Net</th>\
						<tr><td class="label">Input Ah:</td><td>' + device.today_net_input_ah + ' Ah, ' + device.today_net_input_kwh + ' kWh</td></tr>\
						<tr><td class="label">Output Ah:</td><td>' + device.today_net_output_ah + ' Ah, ' + device.today_net_output_kwh + ' kWh</td></tr>\
						<th class="subhead">Accumulation</th>\
						<tr><td class="label">' + shuntLabel[1] + ':</td><td>' + device.accumulated_ah_shunt_a + ' Ah, ' + device.accumulated_kwh_shunt_a + ' kWh</td></tr>\
						<tr><td class="label">' + shuntLabel[2] + ':</td><td>' + device.accumulated_ah_shunt_b + ' Ah, ' + device.accumulated_kwh_shunt_b + ' kWh</td></tr>\
						<tr><td class="label">' + shuntLabel[3] + ':</td><td>' + device.accumulated_ah_shunt_c + ' Ah, ' + device.accumulated_kwh_shunt_c + ' kWh</td></tr>\
						</table>';
			break;

	}

	status_content[div] = value;
	$('#' + div).html(content);
	$('#' + div + '_select').val(value);
	set_cookies(div, value);
}


function get_status() {

	if (json_status) {
		$.getJSON("./matelog", function (data) {
			json_status = data;
		});
	} else {
		$.ajax({
			async: false,
			type: 'GET',
			dataType: 'json',
			url: 'matelog',
			success: function (data) {
				json_status = data;
			}
		});
	}
	set_status("status_top", status_content["status_top"]);
	set_status("status_bottom", status_content["status_bottom"]);
}


function chart_years() {

	years_data_kwhin = [];
	years_data_kwhout = [];
	date = get_formatted_date();
	
	//Get all years in database		
	status = $.ajax({
		async: false,
		type: 'GET',
		dataType: 'json',
		url: 'getstatus.php?q=years&date=' + date,
		success: function (data) {
			available_years = data;
		}
	})

	// TODO:	let's not show ALL the years... I think just five.
	// 			currently the plot function has a 5 year max range, but don't know what that does, last five? first five?

	//Fill array with series
	for (i = 0; i < available_years.length; i++) {

		// TODO: can't i get the clean year data directly from the database with the right sql query?

		split_date = available_years[i].date.split(/[- :]/);	// split the YYYY-MM-DD into an array
		comp_date = new Date(split_date[0], 0, 1);				// use the year to make a date object for jan 1st of that year
		year = comp_date.getTime();								// turn it into millisecond timestamp

		years_data_kwhin[i] = [year, eval(available_years[i].kwh_in)];
		years_data_kwhout[i] = [year, eval(available_years[i].kwh_out)];
		
	}

	// Apply the column chart theme
	Highcharts.setOptions(Highcharts.theme1);

	$('#years_chart').highcharts({
		plotOptions: {
			series: {
				pointRange: 24 * 3600 * 1000 * 365	// 1 year
			}
		},
	    xAxis: {
			minRange: 157785000000, 				// 5 years in milliseconds
			tickInterval: 24 * 3600 * 1000 * 365,	// 1 year
			dateTimeLabelFormats: {
				year: '%Y'
			}
	    },
	    tooltip: {
			formatter: function() {
				var string1 = Highcharts.dateFormat('%Y', this.x);
				var string2 = this.series.name + ': <strong>' + this.y.toFixed(2) + ' kWh</strong>';
				return string1 + '<br/>' + string2;
			}
		},
	    series: [{
	    	name: 'Production',
	        data: years_data_kwhin
		}, {
		    name: 'Usage',
			data: years_data_kwhout
	    }],
	});

}


function chart_months(date) {

	var months_data_kwhin = [];
	var months_data_kwhout = [];
	
	if (!date) {
		date = get_formatted_date();
	}

	$.ajax({
		async: false,
		type: 'GET',
		dataType: 'json',
		url: 'getstatus.php?q=months&date=' + date,
		success: function (data) {
			available_months = data;

		}
	});


	//Fill array with series
	for (i = 0; i < available_months.length; i++) {

		split_date = available_months[i].date.split(/[- :]/);		// split the YYYY-MM-DD into an array
		month_date = new Date(split_date[0], split_date[1] - 1, 1);	// use the month to make a date object for the 1st of the month
		month = month_date.getTime();								// turn it into millisecond timestamp

		months_data_kwhin[i]  = [month, eval(available_months[i].kwh_in)];
		months_data_kwhout[i] = [month, eval(available_months[i].kwh_out)];

	}

	// Apply the column chart theme
	Highcharts.setOptions(Highcharts.theme1);

	$('#months_chart').highcharts({
		plotOptions: {
			series: {
				pointRange: 24 * 3600 * 1000 * 30	// one month
			}
		},
	    xAxis: {
			minRange: 31600000000,					// 1 year in milliseconds
			tickInterval: 24 * 3600 * 1000 * 30,	// 1 month
			dateTimeLabelFormats: {
				month: '%b'
			}
	    },
	    tooltip: {
			formatter: function() {
				var string1 = Highcharts.dateFormat('%B', this.x);
				var string2 = this.series.name + ': <strong>' + this.y.toFixed(2) + ' kWh</strong>';
				return string1 + '<br/>' + string2;
			}
		},	
	    series: [{
	        name: 'Production',
	        data: months_data_kwhin,
		}, {
	        name: 'Usage',
	        data: months_data_kwhout,
	    }],
	});

}


function chart_days_of_month(date) {

	var month_days_data_kwhin = [];
	var month_days_data_kwhout = [];

	if (!date) {
		date = get_formatted_date();
	}

	$.ajax({
		async: false,
		type: 'GET',
		dataType: 'json',
		url: 'getstatus.php?q=month_days&date=' + date,
		success: function (data) {
			available_month_days = data;
		}
	});

	//Fill array with series
	for (i = 0; i < available_month_days.length; i++) {
			
		split_date = available_month_days[i].date.split(/[- :]/);						// split the YYYY-MM-DD into an array
		month_days_date = new Date(split_date[0], split_date[1] - 1, split_date[2]);	// use the month to make a date object for the 1st of the month
		day = month_days_date.getTime();												// turn it into millisecond timestamp
	
		month_days_data_kwhin[i]  = [day, eval(available_month_days[i].kwh_in)];
		month_days_data_kwhout[i] = [day, eval(available_month_days[i].kwh_out)];		
	}

	// Apply the column chart theme
	Highcharts.setOptions(Highcharts.theme1);

	$('#month_days_chart').highcharts({
		plotOptions: {
			series: {
				pointRange: 24 * 3600 * 1000		// 1 day
			}
		},
	    xAxis: {
	    	minRange: 2630000000,					// 1 month in milliseconds
			tickInterval: 24 * 3600 * 1000,			// 1 day
			dateTimeLabelFormats: {
				day: '%e'
			}
	    },
	    tooltip: {
			formatter: function() {
				var string1 = Highcharts.dateFormat('%A, %b %e', this.x);
				var string2 = this.series.name + ': <strong>' + this.y.toFixed(2) + ' kWh</strong>';
				return string1 + '<br/>' + string2;
			}
		},	    
	    series: [{
	        name: 'Production',
	        data: month_days_data_kwhin,
		}, {
	        name: 'Usage',
	        data: month_days_data_kwhout,
	    }],
	});

}

function set_chart(chart_id, content) {

	$('#' + chart_id + '_select').val(content);
	set_cookies(chart_id, content);

	chart_day(chart_id, content);
}

function chart_day(chart_id, content) {
	var chart_data = 0;

	if (!content) {
		content = chart_content[chart_id];
	}

	chart_content[chart_id] = content;

	switch (content) {
		case "charge_power":
			chart_data = charge_power();
			break;
		case "battery_volts":
			chart_data = battery_volts();
			break;
		case "charge_current":
			chart_data = charge_current();
			break;
		case "array_volts":
			chart_data = array_volts();
			break;
		case "array_current":
			chart_data = array_current();
			break;
		case "flexnet_shunts":
			chart_data = flexnet_shunts();
			break;
		case "flexnet_soc":
			chart_data = flexnet_soc();
			break;
		default:
			chart_data = null;
			break;
	}

	// chart the data!
	$('#' + chart_id).highcharts(chart_data);

}


function flexnet_shunts() {

	var day_data_shunt_a = [];
	var day_data_shunt_b = [];
	var day_data_shunt_c = [];

	for (var port in full_day_data[FNDC_ID]) {
		for (y = 0; y < full_day_data[FNDC_ID][port].length; y++) {
			// each "y" is an object with all data for a given timestamp
			split_date = full_day_data[FNDC_ID][port][y].date.split(/[- :]/);
			day_date = (new Date((new Date(split_date[0], split_date[1] - 1, split_date[2], split_date[3], split_date[4]).getTime() - ((new Date().getTimezoneOffset()) * 60000))));		
			day_date = day_date.getTime(); // turn into millisecond timestamp

			total_shunt_a = 0;
			total_shunt_b = 0;
			total_shunt_c = 0;

			for (var j in full_day_data[FNDC_ID]) { //Get wh for all FlexNetDC devices
				total_shunt_a += (full_day_data[FNDC_ID][j][y].shunt_a_amps) * 1;
				total_shunt_b += (full_day_data[FNDC_ID][j][y].shunt_b_amps) * 1;
				total_shunt_c += (full_day_data[FNDC_ID][j][y].shunt_c_amps) * 1;
			}
			
			day_data_shunt_a[y] = [day_date, total_shunt_a];
			day_data_shunt_b[y] = [day_date, total_shunt_b];
			day_data_shunt_c[y] = [day_date, total_shunt_c];
		}
		break; // Only one iteration, only one FLEXnet DC. 
	}

	// Apply the line chart theme
	Highcharts.setOptions(Highcharts.theme2);

	chart_options = {
		chart: {
		    type: 'area'
		},
//		plotOptions: {
//			series: {
//				stacking: 'normal'
//			}
//		},
    	yAxis: {
    		tickInterval: 20,
		    labels: {
		        format: '{value} A'
		    }
		},
		tooltip: {
			formatter: function() {
				var string1 = Highcharts.dateFormat('%l:%M%P', this.x);
				var string2 = this.series.name + ': <strong>' + this.y.toFixed(1) + ' Amps</strong>';
				return string2 + '<br/>' + string1;
			}
		},
	    series: [{
	    	name: shuntLabel[1],
			data: day_data_shunt_a
		}, {
		    name: shuntLabel[2],
			data: day_data_shunt_b
		}, {
		    name: shuntLabel[3],
			data: day_data_shunt_c
	    }]
	};

	return chart_options;
}


function flexnet_soc() {
	day_data_soc = [];

	if (full_day_data[FNDC_ID]) {
		for (var i in full_day_data[FNDC_ID]) {
			for (j = 0; j < full_day_data[FNDC_ID][i].length; j++) {
				split_date = full_day_data[FNDC_ID][i][j].date.split(/[- :]/);
				day_date = (new Date((new Date(split_date[0], split_date[1] - 1, split_date[2], split_date[3], split_date[4]).getTime() - ((new Date().getTimezoneOffset()) * 60000))));
				day_date = day_date.getTime(); // change to microseconds for highcharts
				day_data_soc[j] = [day_date, eval(full_day_data[FNDC_ID][i][j].soc)];
			}
		}
	}

	// Apply the line chart theme
	Highcharts.setOptions(Highcharts.theme2);

	chart_options = {
	    legend: {
	    	enabled: false  
	    },
    	yAxis: {
    		tickInterval: 10,
    		endOnTick: false,
    		max: 100,
    		min: 50,
		    labels: {
		        format: '{value}%'
		    },
		    plotBands: [{
		    	// red from 0 to 59
                color: '#ffedee',
                from: 0,
                to: 59.9
            } , {
            	// yellow from 60 to 79
				color: '#ffffe1',
				from: 60,
				to: 79.9
            } , {
				// green from 80 to 100
				color: '#dfffe0',
				from: 80,
				to: 100
            }]
		},
		tooltip: {
			formatter: function() {
				var string1 = Highcharts.dateFormat('%l:%M%P', this.x);
				var string2 = this.series.name + ': <strong>' + this.y + '%</strong>';
				return string2 + '<br/>' + string1;
			}
		},		
	    series: [{
			name: 'Charge',
			data: day_data_soc
	    }]
	};

	return chart_options;

}


function charge_power() {

	var total_day_data_watts = [];
	var day_data_watts = new Array();
	var all_devices_data = [];
	var charge_mode_fl = [];
	var charge_mode_ab = [];
	var charge_mode_eq = [];
	var count;

	for (var i in full_day_data[CC_ID]) {
		// Device id 3 are FM/MX charge controllers
		// i interates through each FM/MX charge controller
		for (y = 0; y < full_day_data[CC_ID][i].length; y++) {
			split_date = full_day_data[CC_ID][i][y].date.split(/[- :]/);
			day_date = (new Date((new Date(split_date[0], split_date[1] - 1, split_date[2], split_date[3], split_date[4]).getTime() - ((new Date().getTimezoneOffset()) * 60000))));
			day_date = day_date.getTime(); // convert to milliseconds
			
			total_watts = 0;	
			for (var j in full_day_data[CC_ID]) { //Get wh for all FM/MX devices
				// shouldn't assume that every device has a datapoint for every timestamp.
				// BUG: devices can come or go independently of each other.
				total_watts += (full_day_data[CC_ID][j][y].charge_current) * 1 * full_day_data[CC_ID][i][y].battery_volts;
			}
			//[day_date, full_day_data[CC_ID][j][y].charge_current*1];
			if (!day_data_watts[i]) {
				day_data_watts[i] = []
			};

			chrg_mode = full_day_data[CC_ID][i][y].charge_mode

			if (chrg_mode == "Float") {

				if (!charge_mode_fl[i]) {
					charge_mode_fl[i] = []
				};
				charge_mode_fl[i][y] = [day_date, (full_day_data[CC_ID][i][y].charge_current * 1 * full_day_data[CC_ID][i][y].battery_volts)];

			} else if (chrg_mode == "Absorption") {

				if (!charge_mode_ab[i]) {
					charge_mode_ab[i] = []
				};
				charge_mode_ab[i][y] = [day_date, (full_day_data[CC_ID][i][y].charge_current * 1 * full_day_data[CC_ID][i][y].battery_volts)];

			} else if (chrg_mode == "EQ") {

				if (!charge_mode_eq[i]) {
					charge_mode_eq[i] = []
				};
				charge_mode_eq[i][y] = [day_date, (full_day_data[CC_ID][i][y].charge_current * 1 * full_day_data[CC_ID][i][y].battery_volts)];

			}

			day_data_watts[i][y] = [day_date, (full_day_data[CC_ID][i][y].charge_current * 1 * full_day_data[CC_ID][i][y].battery_volts)];
			total_day_data_watts[y] = [day_date, total_watts];
		}
	}

	//
	// Check to see if there's more than one charger
	// If so, then label each series.
	//	
	if (day_data_watts.length > 1) {
		for (var i in day_data_watts) {

			if (deviceLabel[i] != "") {
				// Assign name from cfg file
				chartLabel = deviceLabel[i];
			} else {
				chartLabel = 'FM/MX - Port ' + i;
			}

			series = {
				name: chartLabel,
				type: 'line',
				data: day_data_watts[i]
			};
			
			all_devices_data.push(series);
		}
	}

//	total = {
//		name: 'Total',
//		type: 'areaspline',
//		fillOpacity: 0.1,
//		lineWidth: 0,
//		zIndex: -1,
//		data: total_day_data_watts
//	};
	total = {
		name: 'Total',
		type: 'line',
		lineWidth: 2,
		zIndex: -1,
		data: total_day_data_watts
	};

	all_devices_data.push(total);

	// Apply the line chart theme
	Highcharts.setOptions(Highcharts.theme2);

	chart_options = {
    	yAxis: {
    		tickInterval: 500,
    		min: 0,
		    labels: {
		        format: '{value} W'
		    },
		    
		},
		tooltip: {
			formatter: function() {
				return this.series.name + ': <strong>' + this.y.toFixed(1) + ' Watts</strong>';
			}
		},
	    series: all_devices_data
	};

	return chart_options;

	//
	// Show Charge Mode - checkbox to show the charge mode
	//

	if ($("#chk_mode_bc").is(':checked')) {
		count = 0;
		for (var i in charge_mode_fl) {
			count += 1;
			if (charge_mode_fl[i]) {
				if (count > 1) {
					temp = {
						color: 4,
						// label: "Float",
						legend: {
							show: false
						},
						lines: {
							show: false
						},
						data: charge_mode_fl[i]
					};
				} else {
					temp = {
						color: 4,
						label: "Float",
						lines: {
							show: false
						},
						data: charge_mode_fl[i]
					};
				}
				all_devices_data.push(temp);
			}
		}

		count = 0;
		for (var i in charge_mode_ab) {
			count += 1;
			if (charge_mode_ab[i]) {
				if (count > 1) {
					temp = {
						color: 5,
						// label: "Absorption",
						legend: {
							show: false
						},
						lines: {
							show: false
						},
						data: charge_mode_ab[i]
					};
				} else {
					temp = {
						color: 5,
						label: "Absorption",
						lines: {
							show: false
						},
						data: charge_mode_ab[i]
					};
				}
				all_devices_data.push(temp);
			}
		}

		count = 0;
		for (var i in charge_mode_eq) {
			count += 1;
			if (charge_mode_eq[i]) {
				if (count > 1) {
					temp = {
						color: 6,
						//  label:"Equalization",
						legend: {
							show: false
						},
						lines: {
							show: false
						},
						data: charge_mode_eq[i]
					};
				} else {
					temp = {
						color: 6,
						label: "Equalization",
						lines: {
							show: false
						},
						data: charge_mode_eq[i]
					};
				}
				all_devices_data.push(temp);
			}
		}
	}

}


function charge_current() {
	var total_day_data_amps = [];
	var day_data_amps = new Array();
	var all_devices_data_amps = [];
	var charge_mode_fl = [];
	var charge_mode_ab = [];
	var charge_mode_eq = [];
	var count;



	for (var i in full_day_data[CC_ID]) { //Device id 3 are FM/MX charge controllers
		for (y = 0; y < full_day_data[CC_ID][i].length; y++) {
			split_date = full_day_data[CC_ID][i][y].date.split(/[- :]/);
			day_date = (new Date((new Date(split_date[0], split_date[1] - 1, split_date[2], split_date[3], split_date[4]).getTime() - ((new Date().getTimezoneOffset()) * 60000))));

			total_amps = 0;
			for (var j in full_day_data[CC_ID]) { //Get wh for all FM/MX devices
				if (full_day_data[CC_ID][j][y] !== undefined) {
					total_amps += (full_day_data[CC_ID][j][y].charge_current) * 1;
				}
			}
			//[day_date, full_day_data[CC_ID][j][y].charge_current*1];
			if (!day_data_amps[i]) {
				day_data_amps[i] = []
			};
			day_data_amps[i][y] = [day_date, full_day_data[CC_ID][i][y].charge_current * 1];
			chrg_mode = full_day_data[CC_ID][i][y].charge_mode

			if (chrg_mode == "Float") {
				if (!charge_mode_fl[i]) {
					charge_mode_fl[i] = []
				};
				charge_mode_fl[i][y] = [day_date, full_day_data[CC_ID][i][y].charge_current * 1];

			}
			else if (chrg_mode == "Absorption") {
				if (!charge_mode_ab[i]) {
					charge_mode_ab[i] = []
				};
				charge_mode_ab[i][y] = [day_date, full_day_data[CC_ID][i][y].charge_current * 1];

			}
			else if (chrg_mode == "EQ") {
				if (!charge_mode_eq[i]) {
					charge_mode_eq[i] = []
				};
				charge_mode_eq[i][y] = [day_date, full_day_data[CC_ID][i][y].charge_current * 1];

			}
			total_day_data_amps[y] = [day_date, total_amps];
		}
	}

/*
	// FLOT chart options
	day_options = {
		lines: {
			show: true,
			clickable: true,
			hoverable: true
		},
		shadowSize: 0,
		legend: {
			position: "nw"
		},
		points: {
			show: true,
			clickable: true,
			hoverable: true,
			radius: 2,
			lineWidth: 1,
		},
		xaxis: {
			tickDecimals: 1,
			minTickSize: [1, "hour"],
			mode: "time",
			timeformat: "%I%p",
			clickable: true,
			hoverable: true
		},
		grid: {
			hoverable: true,
			clickable: true
		}







	}
	if (day_data_amps.length > 1) {
		for (var i in day_data_amps) {

			if (deviceLabel[i] != "") {
				// Assign name from cfg file
				chartLabel = deviceLabel[i];
			} else {
				chartLabel = 'FM/MX - Port ' + i;
			}

			temp = {
				label: chartLabel,
				data: day_data_amps[i]
			};
			all_devices_data_amps.push(temp);
		}
	}

	temp = {
		label: 'Total',
		data: total_day_data_amps
	};
	all_devices_data_amps.push(temp);



	if ($("#chk_mode_bc").is(':checked')) {
		count = 0;
		for (var i in charge_mode_fl) {
			count += 1;

			if (charge_mode_fl[i]) {
				if (count > 1) {
					temp = {
						color: 4,
						//  label:"Float",
						legend: {
							show: false
						},
						lines: {
							show: false
						},
						data: charge_mode_fl[i]
					};
				} else {

					temp = {
						color: 4,
						label: "Float",
						lines: {
							show: false
						},
						data: charge_mode_fl[i]
					};


				}
				all_devices_data_amps.push(temp);

			}
		}

		count = 0;
		for (var i in charge_mode_ab) {
			count += 1;

			if (charge_mode_ab[i]) {
				if (count > 1) {
					temp = {
						color: 5,
						//label:"Absorption",
						// legend:{show:false},
						lines: {
							show: false
						},
						data: charge_mode_ab[i]
					};
				} else {

					temp = {
						color: 5,
						label: "Absorption",
						lines: {
							show: false
						},
						data: charge_mode_ab[i]
					};


				}
				all_devices_data_amps.push(temp);

			}
		}

		count = 0;
		for (var i in charge_mode_eq) {
			count += 1;

			if (charge_mode_eq[i]) {
				if (count > 1) {
					temp = {
						color: 6,
						// label:"Equalization",
						// legend:{show:false},
						lines: {
							show: false
						},
						data: charge_mode_eq[i]
					};
				} else {

					temp = {
						color: 6,
						label: "Equalization",
						lines: {
							show: false
						},
						data: charge_mode_eq[i]
					};


				}
				all_devices_data_amps.push(temp);

			}
		}


	}

	var return_var = [all_devices_data_amps, day_options];

	return return_var;
*/

}


function array_volts() {
	var total_day_data__array_volts = [];
	var day_data_array_volts = new Array();
	var all_devices_data_array_volts = [];

	for (var i in full_day_data[CC_ID]) { //Device id 3 are FM/MX charge controllers
		for (y = 0; y < full_day_data[CC_ID][i].length; y++) {
			split_date = full_day_data[CC_ID][i][y].date.split(/[- :]/);
			day_date = (new Date((new Date(split_date[0], split_date[1] - 1, split_date[2], split_date[3], split_date[4]).getTime() - ((new Date().getTimezoneOffset()) * 60000))));


			//[day_date, full_day_data[CC_ID][j][y].charge_current*1];
			if (!day_data_array_volts[i]) {
				day_data_array_volts[i] = []
			};
			day_data_array_volts[i][y] = [day_date, full_day_data[CC_ID][i][y].pv_voltage * 1];
		}
	}

/*
	// FLOT Chart options
	day_options = {
		lines: {
			show: true,
			clickable: true,
			hoverable: true
		},
		shadowSize: 0,
		legend: {
			position: "nw"
		},
		points: {
			show: true,
			clickable: true,
			hoverable: true,
			radius: 2,
			lineWidth: 1,
		},
		xaxis: {
			tickDecimals: 1,
			minTickSize: [1, "hour"],
			mode: "time",
			timeformat: "%I%p",
			clickable: true,
			hoverable: true
		},
		grid: {
			hoverable: true,
			clickable: true
		}



	}


	for (var i in day_data_array_volts) {

		if (deviceLabel[i] != "") {
			// Assign name from cfg file
			chartLabel = deviceLabel[i];
		} else {
			chartLabel = 'FM/MX - Port ' + i;
		}

		temp = {
			label: chartLabel,
			data: day_data_array_volts[i]
		};
		all_devices_data_array_volts.push(temp);

	}

	var return_var = [all_devices_data_array_volts, day_options];
	return return_var;
*/

}


function array_current() {
	var total_day_data__array_amps = [];
	var day_data_array_amps = new Array();
	var all_devices_data_array_amps = []

	for (var i in full_day_data[CC_ID]) { //Device id 3 are FM/MX charge controllers
		for (y = 0; y < full_day_data[CC_ID][i].length; y++) {
			split_date = full_day_data[CC_ID][i][y].date.split(/[- :]/);
			day_date = (new Date((new Date(split_date[0], split_date[1] - 1, split_date[2], split_date[3], split_date[4]).getTime() - ((new Date().getTimezoneOffset()) * 60000))));


			//[day_date, full_day_data[CC_ID][j][y].charge_current*1];
			if (!day_data_array_amps[i]) {
				day_data_array_amps[i] = []
			};
			day_data_array_amps[i][y] = [day_date, full_day_data[CC_ID][i][y].pv_current * 1];
		}
	}

/*
	// FLOT chart options
	day_options = {
		lines: {
			show: true,
			clickable: true,
			hoverable: true
		},
		shadowSize: 0,
		legend: {
			position: "nw"
		},
		points: {
			show: true,
			clickable: true,
			hoverable: true,
			radius: 2,
			lineWidth: 1,
		},
		xaxis: {
			tickDecimals: 1,
			minTickSize: [1, "hour"],
			mode: "time",
			timeformat: "%I%p",
			clickable: true,
			hoverable: true
		},
		grid: {
			hoverable: true,
			clickable: true
		}



	}


	for (var i in day_data_array_amps) {

		if (deviceLabel[i] != "") {
			// Assign name from cfg file
			chartLabel = deviceLabel[i];
		} else {
			chartLabel = 'FM/MX - Port ' + i;
		}

		temp = {
			label: chartLabel,
			data: day_data_array_amps[i]
		};
		all_devices_data_array_amps.push(temp);

	}

	var return_var = [all_devices_data_array_amps, day_options];



	return return_var;
*/
}


function battery_volts() {
	day_data_volts = [];


	if (full_day_data[FNDC_ID]) {
		for (var i in full_day_data[FNDC_ID]) {
			for (j = 0; j < full_day_data[FNDC_ID][i].length; j++) {
				split_date = full_day_data[FNDC_ID][i][j].date.split(/[- :]/);
				day_date = (new Date((new Date(split_date[0], split_date[1] - 1, split_date[2], split_date[3], split_date[4]).getTime() - ((new Date().getTimezoneOffset()) * 60000))));
				day_data_volts[j] = [day_date, full_day_data[FNDC_ID][i][j].battery_volt];
			}
		}
	} else {
		for (var i in full_day_data[CC_ID]) {
			for (j = 0; j < full_day_data[CC_ID][i].length; j++) {
				split_date = full_day_data[CC_ID][i][j].date.split(/[- :]/);
				day_date = (new Date((new Date(split_date[0], split_date[1] - 1, split_date[2], split_date[3], split_date[4]).getTime() - ((new Date().getTimezoneOffset()) * 60000))));
				day_data_volts[j] = [day_date, full_day_data[CC_ID][i][j].battery_volts];
			}

		}
	}


/*
	// FLOT chart options
	day_options = {
		lines: {
			show: true,
			clickable: true,
			hoverable: true
		},
		shadowSize: 0,
		legend: {
			position: "nw"
		},
		points: {
			show: true,
			clickable: true,
			hoverable: true,
			radius: 2,
			lineWidth: 1,
		},
		xaxis: {
			tickDecimals: 1,
			minTickSize: [1, "hour"],
			mode: "time",
			timeformat: "%I%p",
			clickable: true,
			hoverable: true
		},
		grid: {
			hoverable: true,
			clickable: true
		}

	}

	var return_var = [
		[{
			label: "Volts",
			data: day_data_volts
		}], day_options];

	return return_var;
*/

}

//
// this is the crazy way to get shit started in jQuery. Seriously.
//
$( document ).ready(function() {
	load_data();
});
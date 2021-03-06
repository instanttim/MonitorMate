#!/usr/bin/php
<?php
/*
Copyright (C) 2016-2017 Timothy Martin <https://github.com/instanttim>

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

// constants
define("FNDC", 4);
$required_arguments = 2;
$debug = FALSE;

if (!extension_loaded('curl')) {
	exit("This script requires PHP to have the CURL extension loaded.");
}

for ($i = 1; $i < $argc; $i = $i + 2 ) {
	switch ($argv[$i]) {
		case '-a':
			$IP_address = $argv[$i+1];
			break;
		case '-p':
			$port_number = $argv[$i+1];
			$required_arguments--;
			break;
		case '-u':
			$post_URL = $argv[$i+1];
			$required_arguments--;
			break;
		case '-t':
			$token = $argv[$i+1];
			break;
		case '-h':
		case '--help':
			print_help();
			exit();
		case '-d':
			$debug = TRUE;
			break;
		default:
			print("ERROR: Unknown argument ".$argv[$i]."\n\n");
			print_help();
			exit(1);
	}
}

// validate all required arguments exist!
if ($required_arguments != 0) {
	print("ERROR: You didn't supply all the necessary arguments.\n\n");
	print_help();
	exit(1);
} elseif (!isset($IP_address)) {
	$IP_address = "0.0.0.0"; // this will make it listen on ALL interfaces
}

$socket_URL = "udp://".$IP_address.":".$port_number;
$socket = stream_socket_server($socket_URL, $errno, $errstr, STREAM_SERVER_BIND);

if (!$socket) {
	die("$errstr ($errno)");
}

// if the last char is NOT a backslash, then add it.
if (substr_compare($post_URL, "/", strlen($post_URL) - 1) != 0) {
	$post_URL = $post_URL."/";
}
$post_URL = $post_URL."post_datastream.php";

do { // main loop
	// start each iteration with empty data sets
	$post_data_array = array();
	$datastream_array = array();
	$datastream_array['devices'] = array_fill(0,10,null); // make 10 elements all filled with null
	$packet_count = 0;
	$json = NULL;
	$post = NULL;

	if ($debug) {
		print("Processing Packets...\n");
	}

	do { // read data off the socket_get_status
		$pkt = stream_socket_recvfrom($socket, 512, 0, $peer);
		$datastream = NULL;
		$port_address = NULL;
		$device_type = NULL;
		$extra_data_ID = NULL;
		// $data_complete = FALSE;

		// match the parts between the < and >
		if (preg_match_all('/<([0-9,]*)>/', $pkt, $datastream) > 0) {
			$packet_count++;
			foreach ($datastream[1] as $chunk) {
				// the 3rd char of each chunk *should* be the device type
				$port_address = intval(substr($chunk, 0, 2));
				$device_type = intval(substr($chunk, 3, 1));
				$extra_data_ID = intval(substr($chunk, 20, 2));

				$datastream_array['devices'][$port_address - 1] = $chunk;

				if ($device_type == FNDC) {
					if ($extra_data_ID >> 6) {
						// 7th bit is set, thus remove it
						$extra_data_ID = $extra_data_ID & 63;
					}
					$sub_chunk = substr($chunk, 20, 8);
					$datastream_array['extra_data'][$extra_data_ID] = $sub_chunk;
				}            
			}
			
			if ($debug) {
				print($packet_count.".");
				// print_r($datastream[1]);
				// print("\n");
			}

		} else {
			// junk chunks, do nothing for now.
			// TODO: grab the time from these chunks?
		}

		// TODO: instead of just checking the total packet count, i should probably make sure all the extra data is collected?
		// if (isset($datastream_array[FNDC])) {
		// 	if (count($datastream_array['extra_data']) == 14) {
		// 		$data_complete = TRUE;
		// 	}
		// }

	} while ($pkt !== FALSE && $packet_count < 14);

	// make the array for posting
	$post_data_array['time']['relay_local_time'] = date('Y-m-d\TH:i:sP');
	$post_data_array['devices'] = $datastream_array['devices'];
	// if there's FNDC data then sort the extra data before adding to the array.
	if (isset($datastream_array['extra_data'])) {
		ksort($datastream_array['extra_data'], SORT_NATURAL);
		$post_data_array['extra_data'] = $datastream_array['extra_data'];
	}

	$json = json_encode($post_data_array);
	$post = array('token' => $token, 'datastream' => $json);

	// cURL to post the data
	$ch = curl_init($post_URL);
	curl_setopt($ch, CURLOPT_POST, TRUE);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
	$result = curl_exec($ch);
	curl_close($ch);

	if ($debug) {
		print("\n\n".json_encode($datastream_array)."\n\n");
		exit(0);
	}

} while (TRUE); // Infinite loop for now. Maybe later let it fall through for error conditions.

function print_help() {
	print("Usage: php monitormate.php [options]\nOptions:\n\n");
	print("\t-a IP_ADDRESS\t\tIP address on which to listen for data stream. (optional, defaults to all)\n");
	print("\t-p UDP_PORT\t\tPort Mate3 is configured to use for Data Stream.\n");
	print("\t-u URL\t\t\tThe URL to your MonitorMate web server installation.\n");
	print("\t-t TOKEN\t\tToken configured in config.php on your webserver. (optional, but recommended)\n");
	print("\t-d\t\t\tDebug output\n\n");
	print("Example: php monitormate.php -a 10.0.0.1 -p 57027 -u http://mydomain.com/monitormate/\n\n");
}

?>

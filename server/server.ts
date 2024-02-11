import fs from 'fs';
import { Database } from 'sqlite3';
import express, { NextFunction } from 'express';
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
//const fs = require("fs");
const sqlite = require("sqlite")
const sqlite3 = require("sqlite3");
//const Database = sqlite3.Database;
//const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require('cookie-parser');


const PORT = process.env.PORT || 3001;
//process.env is set outside
const JWT_SECRET = process.env.JWT_SECRET || "DevelopmentSecretKey";


let message: string | undefined;
let hadError: boolean;
app.use(cors());
app.use(express.json());
app.use(cookieParser('p3ufucaj55bi2kiy6lsktnm23z4c18xy'));

const saltRounds: number = 10;


//creating the table and storing it in
const user_info = new Database("./database/user_info.db");


//just in case we need again
//user_info.exec(fs.readFileSync(__dirname + '/Tables/CREATE_USER_INFO.sql').toString());

//inserting data
//user_info.exec(fs.readFileSync(__dirname + '/Tables/INSERT_USER_INFO.sql').toString());


//app.get("/message", (req: Request, res: Response) => {
//	res.json({
//		message: "Hello from server!",
//		haha: req.request
//	});
//});


/**
 * body contains the properties email, firstName, lastName, password
 * @todo failed registrations don't display errors at first. FIXME
 */
app.post("/registration", async (req: Request, res: Response) => {
	//console.log(req.body.firstName);
	const salt: string = await bcrypt.genSalt(saltRounds);
	const hashedPassword: string = await bcrypt.hash(req.body.password, salt)
	//console.log("Hash: " + hashedPassword);

	const new_user = user_info.prepare(fs.readFileSync(__dirname + '/Tables/New_User.sql').toString());
	new_user.run([req.body.firstName, req.body.lastName, hashedPassword, req.body.email], cb);

	//console.log(message + " | " + req.body.email);

	res.json({
		registrationSuccess: !hadError,
		message: message,
	});
});

/**
 * body contains the properties email, password
 */
app.post("/login", (req: Request, res: Response) => {
	//console.log(req.body.email);
	//console.log(req.body.password);


	const emailPassWrong: string = "Email or Password is incorrect";

	user_info.get(fs.readFileSync(__dirname + '/Tables/login.sql').toString(), [req.body.email], (err: Error, rows: any) => {
		if (rows === undefined) {
			hadError = true; message = emailPassWrong;
		} else if (err) {
			hadError = true; message = err.message;
		} else {
			hadError = false;
			message = undefined;
		}


		if (!hadError) {
			//console.log("Comparing: " + req.body.password + " + " + rows.Password_User)
			bcrypt
				.compare(req.body.password, rows.Password_User)
				.then(result => {
					//console.log(result);
					let accObj = accountObject(rows);
					if (result) {
						setTokenCookie(res, accObj);
					} else {
						hadError = true;
						message = emailPassWrong;
					}
					res.json({

						loginSuccess: !hadError,
						message: message,
						account: accObj,
					});

				})
				.catch(err => { hadError = true; message = err.message; });
		} else {
			res.json({

				loginSuccess: !hadError,
				message: message,
				account: undefined
			});
		}

	});
	//sends the user to the next screen after login(home screen)
	//if (!hadError) {
	//	res.cookie('name', 'user type here', options);
	//}


});
/**
 * @todo return user info for account storing(email, first, last)
 * @returns user info
 */
app.get('/read-cookie', (req: Request, res: Response) => {
	//console.log(req.signedCookies);
	//console.log("----");
	//console.log(req.signedCookies.sessionToken);
	//console.log("----");

	//cookie should store something and we can get the user info afterwards

	/**@todo do fetch*/
	const verifyAcc: Object | undefined = verifyToken(req.signedCookies.sessionToken);
	//console.log(verifyAcc);


	res.json(verifyAcc);
});
/**
 * logout
 */
app.get('/clear-cookie', (req: Request, res: Response) => {
	res.clearCookie('sessionToken').end();
});

function cb(err: Error | null) {
	if (err) {
		hadError = true;
		message = err.message;
	} else {
		hadError = false;
		message = undefined;
	}
}

/**
 * returns an object to be put in account: object returned
 * @todo I don't know what rows type actually is, unfortunately, so fix that if able
 * 
 * @param rows returned rows from some sql statement
 * @returns
 */
function accountObject(rows: any) {
	return {
		Email: rows?.Email ?? undefined,
		FirstName: rows?.First_Name ?? undefined,
		LastName: rows?.Last_Name ?? undefined,
		PhoneNumber: rows?.Phone_Number ?? undefined,
		AccountType: rows?.Type_User ?? 0,
	};
}

/**
 * res should be passed by reference, and modified here to give a cookie to it
 * @param res
 */
function setTokenCookie(res: Response, accObj: any) {
	const options = {
		httpOnly: true,
		signed: true,
		sameSite: 'lax' as const,
		maxAge: 2 * 60 * 60 * 1000, //2 hours
	};

	const sessionTokenOptions = {
		expiresIn: "1d",
	}

	const sessionToken: string = jwt.sign(
		accObj, //payload
		JWT_SECRET, //key
		sessionTokenOptions //options
	);


	//cookie(name of cookie, value of cookie, options of cookie)
	res.cookie('sessionToken', sessionToken, options);

}

/**
 * Verifies the session token is proper. Returned value can be used as true on success, false on error
 * @param token
 * @returns object with account details if validated, and undefined if error
 */
const verifyToken = function (token: string): Object | undefined {
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch (e) {
		return undefined;
	}

}
/**Send block info to the blocked database*/
app.post("/send-blocked", async (req: Request, res: Response) => {
	const dbPromise = sqlite.open({
		filename: "./database/blocked.sqlite",
		driver: sqlite3.Database
	});

	const db = await dbPromise;

	let rider_id = req.body.rider_id;
	let driver_id = req.body.driver_id; /** @TODO Replace value with actual driver email */

	await db.run('INSERT INTO BLOCKED (rider_id, driver_id) VALUES(?,?)', rider_id, driver_id);
});

/** Send ratings to the ratings database*/
app.post("/send-ratings", async (req: Request, res: Response) => {
	const dbPromise = sqlite.open({
		filename: "./database/ratings.sqlite",
		driver: sqlite3.Database
	});

	const db = await dbPromise;

	let rater = req.body.rater;
	let ratee = req.body.ratee; /** @TODO Replace value with actual ratee email */
	let star_rating = req.body.star_rating;
	let comments = req.body.comments;

	await db.run('INSERT INTO Ratings (Rater, Ratee, Star_Rating, Comments) VALUES (?,?,?,?)', rater, ratee, star_rating, comments);

	/** @TODO Calculate new average user rating with aggregate average */

	/** @returns true if favorited and false if not favorited */
	let favoritedDriver = req.body.favoritedDriver

	/** @TODO Add driver to the rider's favorites list if true */
});

/** Send report to reports database */
app.post("/send-report", async (req: Request, res: Response) => {
	const dbPromise = sqlite.open({
		filename: "./database/reports.sqlite",
		driver: sqlite3.Database
	});

	const db = await dbPromise;

	let email = req.body.email;
	let reported_id = "Test email" /** @TODO Replace value with actual reportee email */
	let reason = req.body.reason;
	let comments = req.body.comments;

	await db.run(`INSERT INTO Reports (email, reported_id, reason, comments) VALUES (?,?,?,?)`, email, reported_id, reason, comments);
});

/** Send payment to payments database */
app.post("/send-payment", async (req: Request, res: Response) => {
	const dbPromise = sqlite.open({
		filename: "./database/payments.sqlite",
		driver: sqlite3.Database
	});

	const db = await dbPromise;

	let rider_email = req.body.riderEmail;
	let driver_email = "Test email" /** @TODO Replace value with actual email */
	let ride_cost = req.body.rideCost;
	let currentDate = new Date().toLocaleDateString();
	let currentTime = new Date().toLocaleTimeString();

	await db.run(`INSERT INTO Payments (rider_email, driver_email, ride_cost, payment_date, payment_time) VALUES (?,?,?,?,?)`, rider_email, driver_email, ride_cost, currentDate, currentTime);

	/* delete duplicate records from the table */
	await db.run(`DELETE FROM Payments WHERE payment_id NOT IN (SELECT MIN(payment_id) FROM Payments GROUP BY rider_email, driver_email, ride_cost, payment_date, payment_time)`);
});

app.get("/available-drivers", async (req: Request, res: Response) => {
	let riderEmail = req.query.riderEmail as string; /** @returns current rider's email */

	const dbGetFavoriteDriversPromise = sqlite.open({
		filename: "./database/favorites.sqlite",
		driver: sqlite3.Database
	});
	let dbFavoriteDrivers = await dbGetFavoriteDriversPromise;

	const dbAvailableDriversPromise = sqlite.open({
		filename: "./database/user_info.db",
		driver: sqlite3.Database
	});
	let dbAvailableDrivers = await dbAvailableDriversPromise;

	const dbBlockedDriversPromise = sqlite.open({
		filename: "./database/blocked.sqlite",
		driver: sqlite3.Database
	});
	let dbBlockedDrivers = await dbBlockedDriversPromise;

	let getFavoriteDriversListResults = await dbFavoriteDrivers.all(`SELECT Driver_Email FROM Favorites WHERE Rider_Email = '${riderEmail}'`);
	let getAvailableDriversListResults = await dbAvailableDrivers.all(`SELECT * FROM USER_INFO WHERE Type_User = 2 AND Status_User = 'TRUE'`);
	let getBlockedDriversListResults = await dbBlockedDrivers.all(`SELECT * FROM BLOCKED WHERE rider_id = '${riderEmail}'`);

	// List of Available Favorite Drivers
	let availableFavoriteDrivers = getFavoriteDriversListResults
		.filter((favorite: { Driver_Email: any; }) => {
			return getAvailableDriversListResults.some((driver: { Email: any; }) => driver.Email === favorite.Driver_Email);
		})
		.map((favorite: { Driver_Email: any; }) => {
			const driverInfo = getAvailableDriversListResults.find((driver: { Email: any; }) => driver.Email === favorite.Driver_Email);
			if (driverInfo) {
				return {
					email: favorite.Driver_Email,
					first_name: driverInfo.First_Name,
					last_name: driverInfo.Last_Name
				};
			} else {
				// Handle the case where driverInfo is not found
				console.error(`Driver info not found for email: ${favorite.Driver_Email}`);
				return null;
			}
		})
		.filter(Boolean); // Remove null values from the array

	// List of Other Available Drivers (Excluding User's Blocked Drivers)
	let blockedDrivers = getBlockedDriversListResults.map((blocked: { driver_id: any; }) => blocked.driver_id);
	let otherAvailableDrivers = getAvailableDriversListResults
		.filter((driver: { Email: any; }) => {
			return !blockedDrivers.includes(driver.Email);
		})
		.filter((driver: { Email: any; }) => {
			return !availableFavoriteDrivers.some((favorite: { email: any; }) => favorite && favorite.email === driver.Email);
		});

	res.json({
		availableFavoriteDrivers: availableFavoriteDrivers,
		otherAvailableDrivers: otherAvailableDrivers
	});
});

app.get("/ride-history", async (req: Request, res: Response) => {
	let accountType = req.query.accountType;
	let accountEmail = req.query.accountEmail;

	const dbGetRideHistoryPromise = sqlite.open({
		filename: "./database/ridehistory.sqlite",
		driver: sqlite3.Database
	});
	let getRideHistory = await dbGetRideHistoryPromise;

	/** @TODO Don't show rider's/driver's email */
	let getRiderHistoryResults = await getRideHistory.all(`SELECT RideHistory_ID, Driver_ID, Ride_Date, Pickup, Dropoff, Pay FROM HISTORY WHERE Rider_ID='${accountEmail}'`)
	let getDriverHistoryResults = await getRideHistory.all(`SELECT RideHistory_ID, Rider_ID, Ride_Date, Pickup, Dropoff, Earned FROM HISTORY WHERE Driver_ID='${accountEmail}'`)

	res.json({
		ridersHistoryList: getRiderHistoryResults,
		driversHistoryList: getDriverHistoryResults
	});
})

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}.`);
});
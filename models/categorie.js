var mongoose			= require('mongoose'),
	categorieSchema		= new mongoose.Schema({
		title:String,
		icon:String,
		forums: []
	});

	module.exports = mongoose.model('Categorie',categorieSchema);
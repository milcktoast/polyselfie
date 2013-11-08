/*jshint node:true*/
module.exports = function (grunt) {
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-browserify");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-jshint");

	grunt.initConfig({
		browserify: {
			main: {
				options: { transform: ["brfs"] },
				files: {
					"js/main-bundle.js": ["js/src/main.js"]
				}
			}
		},

		uglify: {
			main: {
				files: {
					"js/main-bundle.js": ["js/main-bundle.js"]
				}
			}
		},

		jshint: {
			all: {
				options: { jshintrc: true },
				files: { src: ["js/src/**/*.js"] }
			}
		},

		watch: {
			scripts: {
				files: ["js/**/*"],
				tasks: ["browserify"],
				options: {
					spawn: false,
				}
			}
		}
	});

	grunt.registerTask("build", ["jshint", "browserify", "uglify"]);
	grunt.registerTask("default", "watch");
};

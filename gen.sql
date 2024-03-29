-- MySQL Script generated by MySQL Workbench
-- Wed Mar 22 23:35:54 2023
-- Model: New Model    Version: 1.0
-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema internsit
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema internsit
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `internsit` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `internsit` ;

-- -----------------------------------------------------
-- Table `internsit`.`academic_years`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`academic_years` ;

CREATE TABLE IF NOT EXISTS `internsit`.`academic_years` (
  `academic_year` VARCHAR(255) NOT NULL,
  `status` TINYINT(1) NOT NULL DEFAULT '0',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`academic_year`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `internsit`.`adonis_schema`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`adonis_schema` ;

CREATE TABLE IF NOT EXISTS `internsit`.`adonis_schema` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `batch` INT NOT NULL,
  `migration_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 10
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `internsit`.`adonis_schema_versions`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`adonis_schema_versions` ;

CREATE TABLE IF NOT EXISTS `internsit`.`adonis_schema_versions` (
  `version` INT NOT NULL)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `internsit`.`users`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`users` ;

CREATE TABLE IF NOT EXISTS `internsit`.`users` (
  `user_id` VARCHAR(80) NOT NULL,
  `firstname` VARCHAR(80) NULL DEFAULT NULL,
  `lastname` VARCHAR(80) NULL DEFAULT NULL,
  `email` VARCHAR(80) NULL DEFAULT NULL,
  `role` VARCHAR(80) NOT NULL DEFAULT 'student',
  `password` VARCHAR(500) NULL DEFAULT NULL,
  `remember_me_token` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`user_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `internsit`.`users_in_academic_years`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`users_in_academic_years` ;

CREATE TABLE IF NOT EXISTS `internsit`.`users_in_academic_years` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(80) NULL DEFAULT NULL,
  `academic_year` VARCHAR(255) NULL DEFAULT NULL,
  `approved` TINYINT(1) NOT NULL DEFAULT '0',
  `advisor_ac_id` INT UNSIGNED NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `users_in_academic_years_academic_year_user_id_unique` (`academic_year` ASC, `user_id` ASC) VISIBLE,
  INDEX `users_in_academic_years_user_id_foreign` (`user_id` ASC) VISIBLE,
  INDEX `users_in_academic_years_advisor_ac_id_foreign` (`advisor_ac_id` ASC) VISIBLE,
  CONSTRAINT `users_in_academic_years_academic_year_foreign`
    FOREIGN KEY (`academic_year`)
    REFERENCES `internsit`.`academic_years` (`academic_year`)
    ON DELETE CASCADE,
  CONSTRAINT `users_in_academic_years_advisor_ac_id_foreign`
    FOREIGN KEY (`advisor_ac_id`)
    REFERENCES `internsit`.`users_in_academic_years` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `users_in_academic_years_user_id_foreign`
    FOREIGN KEY (`user_id`)
    REFERENCES `internsit`.`users` (`user_id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `internsit`.`advisors`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`advisors` ;

CREATE TABLE IF NOT EXISTS `internsit`.`advisors` (
  `advisor_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`advisor_id`),
  CONSTRAINT `advisors_advisor_id_foreign`
    FOREIGN KEY (`advisor_id`)
    REFERENCES `internsit`.`users_in_academic_years` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `internsit`.`posts`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`posts` ;

CREATE TABLE IF NOT EXISTS `internsit`.`posts` (
  `post_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `topic` VARCHAR(80) NOT NULL,
  `content` VARCHAR(10000) NOT NULL,
  `fav` INT NULL DEFAULT NULL,
  `user_in_academic_year_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`post_id`),
  INDEX `posts_user_in_academic_year_id_foreign` (`user_in_academic_year_id` ASC) VISIBLE,
  CONSTRAINT `posts_user_in_academic_year_id_foreign`
    FOREIGN KEY (`user_in_academic_year_id`)
    REFERENCES `internsit`.`users_in_academic_years` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `internsit`.`users_has_docs`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`users_has_docs` ;

CREATE TABLE IF NOT EXISTS `internsit`.`users_has_docs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_in_academic_year_id` INT UNSIGNED NULL DEFAULT NULL,
  `no_approve_reason` VARCHAR(500) NULL DEFAULT NULL,
  `advisor_date` VARCHAR(255) NULL DEFAULT NULL,
  `student_date` VARCHAR(255) NULL DEFAULT NULL,
  `complete_date` VARCHAR(255) NULL DEFAULT NULL,
  `meeting_link` VARCHAR(255) NULL DEFAULT NULL,
  `supervision_status` ENUM('Pending', 'Done') NULL DEFAULT NULL,
  `date_confirm_status` VARCHAR(255) NULL DEFAULT NULL,
  `step` ENUM('TR-01', 'TR-02', 'Informed supervision', 'Presentation', 'TR-03 and TR-08', 'TR-03 and TR-06', 'TR-03, TR-05 and Supervision', 'TR-03 and TR-05', 'Supervision', 'TR-03 and TR-05 (1/6)', 'Informed supervision (1/6)', 'TR-03 and TR-05 (2/6)', 'Informed supervision (2/6)', 'TR-03 and TR-05 (3/6)', 'Informed supervision (3/6)', 'TR-03 and TR-05 (4/6)', 'Informed supervision (4/6)', 'TR-03 and TR-05 (5/6)', 'Informed supervision (5/6)', 'TR-03 and TR-05 (6/6)', 'Informed supervision (6/6)', 'TR-03 and TR-05 (1/4)', 'Informed supervision (1/4)', 'TR-03 and TR-05 (2/4)', 'Informed supervision (2/4)', 'TR-03 and TR-05 (3/4)', 'Informed supervision (3/4)', 'TR-03 and TR-05 (4/4)', 'Informed supervision (4/4)') NULL DEFAULT NULL,
  `status` ENUM('Pending', 'Disapproved', 'Approved', 'Waiting') NULL DEFAULT NULL,
  `is_react` TINYINT(1) NOT NULL DEFAULT '0',
  `is_signed` TINYINT(1) NOT NULL DEFAULT '0',
  `is_new` TINYINT(1) NOT NULL DEFAULT '0',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `users_has_docs_user_in_academic_year_id_foreign` (`user_in_academic_year_id` ASC) VISIBLE,
  CONSTRAINT `users_has_docs_user_in_academic_year_id_foreign`
    FOREIGN KEY (`user_in_academic_year_id`)
    REFERENCES `internsit`.`users_in_academic_years` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `internsit`.`files`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`files` ;

CREATE TABLE IF NOT EXISTS `internsit`.`files` (
  `file_id` VARCHAR(80) NOT NULL,
  `file_name` VARCHAR(80) NOT NULL,
  `file_size` VARCHAR(10) NOT NULL,
  `post_id` INT UNSIGNED NULL DEFAULT NULL,
  `user_has_doc_id` INT UNSIGNED NULL DEFAULT NULL,
  `step_file_type` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`file_id`),
  INDEX `files_post_id_foreign` (`post_id` ASC) VISIBLE,
  INDEX `files_user_has_doc_id_foreign` (`user_has_doc_id` ASC) VISIBLE,
  CONSTRAINT `files_post_id_foreign`
    FOREIGN KEY (`post_id`)
    REFERENCES `internsit`.`posts` (`post_id`)
    ON DELETE CASCADE,
  CONSTRAINT `files_user_has_doc_id_foreign`
    FOREIGN KEY (`user_has_doc_id`)
    REFERENCES `internsit`.`users_has_docs` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `internsit`.`staff`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`staff` ;

CREATE TABLE IF NOT EXISTS `internsit`.`staff` (
  `staff_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`staff_id`),
  CONSTRAINT `staff_staff_id_foreign`
    FOREIGN KEY (`staff_id`)
    REFERENCES `internsit`.`users_in_academic_years` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `internsit`.`students`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `internsit`.`students` ;

CREATE TABLE IF NOT EXISTS `internsit`.`students` (
  `student_id` INT UNSIGNED NOT NULL,
  `department` VARCHAR(80) NULL DEFAULT NULL,
  `position` VARCHAR(80) NULL DEFAULT NULL,
  `firm` VARCHAR(80) NULL DEFAULT NULL,
  `plan` INT NULL DEFAULT NULL,
  `tel` VARCHAR(10) NULL DEFAULT NULL,
  `start_date` DATE NULL DEFAULT NULL,
  `end_date` DATE NULL DEFAULT NULL,
  `mentor_name` VARCHAR(80) NULL DEFAULT NULL,
  `mentor_email` VARCHAR(80) NULL DEFAULT NULL,
  `mentor_position` VARCHAR(80) NULL DEFAULT NULL,
  `mentor_tel_no` VARCHAR(10) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`student_id`),
  CONSTRAINT `students_student_id_foreign`
    FOREIGN KEY (`student_id`)
    REFERENCES `internsit`.`users_in_academic_years` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

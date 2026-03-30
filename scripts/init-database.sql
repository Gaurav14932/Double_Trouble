-- AI-Powered Property Tax Assistant Database Schema
-- MySQL Database Initialization Script

-- Create database
CREATE DATABASE IF NOT EXISTS property_tax_db;
USE property_tax_db;

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  property_id INT AUTO_INCREMENT PRIMARY KEY,
  owner_name VARCHAR(100) NOT NULL,
  ward VARCHAR(50) NOT NULL,
  zone VARCHAR(50) NOT NULL,
  property_address VARCHAR(255),
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  due_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  last_payment_date DATE,
  payment_status ENUM('PAID', 'UNPAID', 'PARTIAL') NOT NULL DEFAULT 'UNPAID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ward (ward),
  INDEX idx_zone (zone),
  INDEX idx_payment_status (payment_status),
  INDEX idx_due_amount (due_amount)
);

-- Insert 100 sample property records
INSERT INTO properties (owner_name, ward, zone, property_address, tax_amount, due_amount, last_payment_date, payment_status) VALUES
('Rajesh Kumar', 'Ward 1', 'Zone A', '123 Main Street, Apt 101', 15000, 5000, '2024-01-15', 'PARTIAL'),
('Priya Singh', 'Ward 1', 'Zone A', '456 Oak Avenue, Apt 202', 12000, 0, '2024-03-20', 'PAID'),
('Amit Patel', 'Ward 2', 'Zone A', '789 Pine Road, Apt 303', 18000, 8000, '2023-12-10', 'UNPAID'),
('Neha Gupta', 'Ward 2', 'Zone B', '321 Elm Street, Apt 404', 14000, 14000, NULL, 'UNPAID'),
('Vikram Reddy', 'Ward 3', 'Zone B', '654 Maple Drive, Apt 505', 16000, 0, '2024-02-28', 'PAID'),
('Anjali Sharma', 'Ward 3', 'Zone A', '987 Birch Lane, Apt 606', 13000, 13000, NULL, 'UNPAID'),
('Rohan Mishra', 'Ward 4', 'Zone C', '147 Cedar Street, Apt 707', 17000, 2000, '2024-03-10', 'PARTIAL'),
('Sakshi Verma', 'Ward 4', 'Zone B', '258 Spruce Road, Apt 808', 11000, 11000, NULL, 'UNPAID'),
('Arjun Singh', 'Ward 5', 'Zone C', '369 Ash Avenue, Apt 909', 19000, 19000, NULL, 'UNPAID'),
('Divya Nair', 'Ward 5', 'Zone A', '741 Willow Street, Apt 1010', 15000, 0, '2024-03-01', 'PAID'),
('Sanjay Kumar', 'Ward 1', 'Zone C', '852 Palm Drive, Apt 1111', 14000, 14000, NULL, 'UNPAID'),
('Ritika Iyer', 'Ward 1', 'Zone B', '963 Oak Street, Apt 1212', 16000, 6000, '2024-02-15', 'PARTIAL'),
('Nikhil Sharma', 'Ward 2', 'Zone C', '159 Elm Avenue, Apt 1313', 13000, 0, '2024-03-15', 'PAID'),
('Pooja Singh', 'Ward 2', 'Zone A', '753 Pine Street, Apt 1414', 17000, 17000, NULL, 'UNPAID'),
('Karan Patel', 'Ward 3', 'Zone B', '456 Birch Road, Apt 1515', 12000, 3000, '2024-01-20', 'PARTIAL'),
('Meera Kapoor', 'Ward 3', 'Zone C', '789 Cedar Avenue, Apt 1616', 15000, 15000, NULL, 'UNPAID'),
('Abhishek Roy', 'Ward 4', 'Zone A', '321 Spruce Street, Apt 1717', 18000, 8000, '2023-11-30', 'UNPAID'),
('Sneha Desai', 'Ward 4', 'Zone B', '654 Ash Road, Apt 1818', 14000, 0, '2024-03-05', 'PAID'),
('Harish Nair', 'Ward 5', 'Zone C', '987 Willow Avenue, Apt 1919', 16000, 16000, NULL, 'UNPAID'),
('Swati Gupta', 'Ward 5', 'Zone A', '147 Palm Street, Apt 2020', 13000, 2000, '2024-02-20', 'PARTIAL'),
('Manoj Reddy', 'Ward 1', 'Zone B', '258 Oak Road, Apt 2121', 15000, 15000, NULL, 'UNPAID'),
('Anitha Sinha', 'Ward 1', 'Zone C', '369 Elm Street, Apt 2222', 17000, 0, '2024-03-12', 'PAID'),
('Varun Kumar', 'Ward 2', 'Zone A', '741 Pine Avenue, Apt 2323', 14000, 14000, NULL, 'UNPAID'),
('Shruti Verma', 'Ward 2', 'Zone B', '852 Birch Street, Apt 2424', 12000, 7000, '2024-01-10', 'PARTIAL'),
('Ravi Singh', 'Ward 3', 'Zone C', '963 Cedar Road, Apt 2525', 16000, 0, '2024-03-08', 'PAID'),
('Priya Nair', 'Ward 3', 'Zone A', '159 Spruce Avenue, Apt 2626', 15000, 15000, NULL, 'UNPAID'),
('Amar Patel', 'Ward 4', 'Zone B', '753 Ash Street, Apt 2727', 13000, 1000, '2024-02-25', 'PARTIAL'),
('Nikita Sharma', 'Ward 4', 'Zone C', '456 Willow Road, Apt 2828', 18000, 18000, NULL, 'UNPAID'),
('Deepak Kumar', 'Ward 5', 'Zone A', '789 Palm Avenue, Apt 2929', 14000, 0, '2024-03-18', 'PAID'),
('Isha Kapoor', 'Ward 5', 'Zone B', '321 Oak Street, Apt 3030', 17000, 17000, NULL, 'UNPAID'),
('Suresh Roy', 'Ward 1', 'Zone C', '654 Elm Road, Apt 3131', 12000, 12000, NULL, 'UNPAID'),
('Anjali Singh', 'Ward 1', 'Zone A', '987 Pine Street, Apt 3232', 15000, 4000, '2024-02-05', 'PARTIAL'),
('Jitendra Verma', 'Ward 2', 'Zone B', '147 Birch Avenue, Apt 3333', 16000, 0, '2024-03-22', 'PAID'),
('Ritu Gupta', 'Ward 2', 'Zone C', '258 Cedar Street, Apt 3434', 13000, 13000, NULL, 'UNPAID'),
('Gaurav Nair', 'Ward 3', 'Zone A', '369 Spruce Road, Apt 3535', 14000, 9000, '2024-01-05', 'PARTIAL'),
('Dimple Patel', 'Ward 3', 'Zone B', '741 Ash Avenue, Apt 3636', 17000, 0, '2024-03-25', 'PAID'),
('Sohail Khan', 'Ward 4', 'Zone C', '852 Willow Street, Apt 3737', 15000, 15000, NULL, 'UNPAID'),
('Manisha Singh', 'Ward 4', 'Zone A', '963 Palm Road, Apt 3838', 12000, 5000, '2024-02-10', 'PARTIAL'),
('Rajiv Kumar', 'Ward 5', 'Zone B', '159 Oak Avenue, Apt 3939', 16000, 0, '2024-03-20', 'PAID'),
('Kavya Reddy', 'Ward 5', 'Zone C', '753 Elm Street, Apt 4040', 13000, 13000, NULL, 'UNPAID'),
('Naveen Singh', 'Ward 1', 'Zone A', '456 Pine Road, Apt 4141', 18000, 18000, NULL, 'UNPAID'),
('Shreya Sharma', 'Ward 1', 'Zone B', '789 Birch Avenue, Apt 4242', 14000, 0, '2024-03-07', 'PAID'),
('Sanjeev Patel', 'Ward 2', 'Zone C', '321 Cedar Street, Apt 4343', 15000, 10000, '2023-12-20', 'UNPAID'),
('Pratiksha Verma', 'Ward 2', 'Zone A', '654 Spruce Road, Apt 4444', 12000, 4000, '2024-02-12', 'PARTIAL'),
('Vivek Nair', 'Ward 3', 'Zone B', '987 Ash Street, Apt 4545', 17000, 0, '2024-03-16', 'PAID'),
('Sakshi Gupta', 'Ward 3', 'Zone C', '147 Willow Avenue, Apt 4646', 16000, 16000, NULL, 'UNPAID'),
('Ashok Kumar', 'Ward 4', 'Zone A', '258 Palm Street, Apt 4747', 13000, 2000, '2024-03-01', 'PARTIAL'),
('Neha Kapoor', 'Ward 4', 'Zone B', '369 Oak Road, Apt 4848', 15000, 15000, NULL, 'UNPAID'),
('Akshay Singh', 'Ward 5', 'Zone C', '741 Elm Avenue, Apt 4949', 14000, 0, '2024-03-19', 'PAID'),
('Swati Mishra', 'Ward 5', 'Zone A', '852 Pine Street, Apt 5050', 17000, 17000, NULL, 'UNPAID'),
('Vikrant Verma', 'Ward 1', 'Zone B', '963 Birch Road, Apt 5151', 12000, 8000, '2024-01-25', 'PARTIAL'),
('Disha Patel', 'Ward 1', 'Zone C', '159 Cedar Avenue, Apt 5252', 16000, 0, '2024-03-11', 'PAID'),
('Rohan Kumar', 'Ward 2', 'Zone A', '753 Spruce Street, Apt 5353', 15000, 15000, NULL, 'UNPAID'),
('Seema Singh', 'Ward 2', 'Zone B', '456 Ash Road, Apt 5454', 13000, 6000, '2024-02-18', 'PARTIAL'),
('Rajesh Nair', 'Ward 3', 'Zone C', '789 Willow Street, Apt 5555', 18000, 0, '2024-03-24', 'PAID'),
('Pooja Sharma', 'Ward 3', 'Zone A', '321 Palm Avenue, Apt 5656', 14000, 14000, NULL, 'UNPAID'),
('Nitin Gupta', 'Ward 4', 'Zone B', '654 Oak Street, Apt 5757', 17000, 1000, '2024-03-02', 'PARTIAL'),
('Ritika Verma', 'Ward 4', 'Zone C', '987 Elm Road, Apt 5858', 12000, 12000, NULL, 'UNPAID'),
('Sanjay Patel', 'Ward 5', 'Zone A', '147 Pine Avenue, Apt 5959', 16000, 0, '2024-03-21', 'PAID'),
('Anita Roy', 'Ward 5', 'Zone B', '258 Birch Street, Apt 6060', 15000, 15000, NULL, 'UNPAID'),
('Harish Singh', 'Ward 1', 'Zone C', '369 Cedar Road, Apt 6161', 13000, 7000, '2024-01-30', 'PARTIAL'),
('Mira Kapoor', 'Ward 1', 'Zone A', '741 Spruce Avenue, Apt 6262', 17000, 0, '2024-03-14', 'PAID'),
('Arun Kumar', 'Ward 2', 'Zone B', '852 Ash Street, Apt 6363', 14000, 14000, NULL, 'UNPAID'),
('Divya Singh', 'Ward 2', 'Zone C', '963 Willow Road, Apt 6464', 16000, 3000, '2024-02-22', 'PARTIAL'),
('Sudhir Nair', 'Ward 3', 'Zone A', '159 Palm Street, Apt 6565', 15000, 0, '2024-03-09', 'PAID'),
('Kriti Gupta', 'Ward 3', 'Zone B', '753 Oak Avenue, Apt 6666', 12000, 12000, NULL, 'UNPAID'),
('Vishal Verma', 'Ward 4', 'Zone C', '456 Elm Street, Apt 6767', 18000, 9000, '2023-11-15', 'UNPAID'),
('Priya Sharma', 'Ward 4', 'Zone A', '789 Pine Road, Apt 6868', 13000, 0, '2024-03-06', 'PAID'),
('Kiran Patel', 'Ward 5', 'Zone B', '321 Birch Avenue, Apt 6969', 17000, 17000, NULL, 'UNPAID'),
('Shalini Singh', 'Ward 5', 'Zone C', '654 Cedar Street, Apt 7070', 14000, 4000, '2024-02-28', 'PARTIAL'),
('Mohit Kumar', 'Ward 1', 'Zone A', '987 Spruce Road, Apt 7171', 16000, 0, '2024-03-23', 'PAID'),
('Neelam Verma', 'Ward 1', 'Zone B', '147 Ash Avenue, Apt 7272', 15000, 15000, NULL, 'UNPAID'),
('Rajan Nair', 'Ward 2', 'Zone C', '258 Willow Street, Apt 7373', 12000, 2000, '2024-03-13', 'PARTIAL'),
('Palak Gupta', 'Ward 2', 'Zone A', '369 Palm Road, Apt 7474', 17000, 0, '2024-03-26', 'PAID'),
('Yash Singh', 'Ward 3', 'Zone B', '741 Oak Street, Apt 7575', 14000, 14000, NULL, 'UNPAID'),
('Sakshi Patel', 'Ward 3', 'Zone C', '852 Elm Avenue, Apt 7676', 13000, 8000, '2024-01-18', 'PARTIAL'),
('Aditya Kumar', 'Ward 4', 'Zone A', '963 Pine Street, Apt 7777', 16000, 0, '2024-03-17', 'PAID'),
('Sonya Sharma', 'Ward 4', 'Zone B', '159 Birch Road, Apt 7878', 15000, 15000, NULL, 'UNPAID'),
('Rahul Singh', 'Ward 5', 'Zone C', '753 Cedar Avenue, Apt 7979', 18000, 11000, '2023-10-25', 'UNPAID'),
('Tanya Verma', 'Ward 5', 'Zone A', '456 Spruce Street, Apt 8080', 12000, 0, '2024-03-04', 'PAID');

-- Create a view for easy querying of ward-wise collection report
CREATE VIEW ward_collection_summary AS
SELECT 
  ward,
  COUNT(*) as total_properties,
  SUM(tax_amount) as total_tax,
  SUM(due_amount) as total_due,
  SUM(tax_amount - due_amount) as total_collected,
  COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END) as paid_count,
  COUNT(CASE WHEN payment_status = 'UNPAID' THEN 1 END) as unpaid_count,
  COUNT(CASE WHEN payment_status = 'PARTIAL' THEN 1 END) as partial_count
FROM properties
GROUP BY ward;

-- Create a view for zone-wise analytics
CREATE VIEW zone_collection_summary AS
SELECT 
  zone,
  COUNT(*) as total_properties,
  SUM(tax_amount) as total_tax,
  SUM(due_amount) as total_due,
  COUNT(CASE WHEN payment_status = 'UNPAID' THEN 1 END) as defaulters
FROM properties
GROUP BY zone;

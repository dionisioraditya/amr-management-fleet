<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('missions', function (Blueprint $table) {
            $table->id();
            $table->string('vehicle_id')->nullable();
            $table->foreign('vehicle_id')->references('id')->on('vehicles')->nullOnDelete();
            $table->string('name');
            $table->timestamp('schedule')->nullable();
            $table->string('priority')->default('normal'); // 'low', 'normal', 'high', 'urgent'
            $table->string('status')->default('pending')->index(); // 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('missions');
    }
};
